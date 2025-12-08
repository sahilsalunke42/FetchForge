// queue.ts implements a lightweight asynchronous request queue with concurrency control, ensuring that only a specified number of requests run at the same time. It exposes a RequestQueue class with a constructor accepting maxConcurrency and an optional priority flag. Internally, it maintains a FIFO list (or a min-heap if priorities are enabled) of pending tasks and tracks activeCount. When enqueue(fn, priority?) is called, the queue stores the task and returns a promise that resolves when the request is actually executed. The queue continuously checks if activeCount < maxConcurrency; if so, it pulls the next task, increments activeCount, runs the function, awaits its completion, decrements activeCount, and immediately schedules the next queued task. All pending tasks are isolated via individual promises, ensuring clean resolution and rejection. The queue does not know anything about HTTP—only about managing execution flow—so HttpClient delegates each request attempt to queue.enqueue(() => executeOnce(req)). This makes concurrency handling predictable, prevents overload, allows priority scheduling, enables batching strategies, and keeps HttpClient’s orchestrator clean and modular.

type QueueTask<T> = {
    fn: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: any) => void;
    priority?: number;
};

export class RequestQueue {
    private maxConcurrency: number;
    private activeCount: number = 0;
    private queue: QueueTask<any>[] = [];
    private enablePriority: boolean;

    constructor(maxConcurrency: number, enablePriority = false) {
        this.maxConcurrency = maxConcurrency;
        this.enablePriority = enablePriority;
    }   
    async enqueue<T>(fn: () => Promise<T>, priority?: number): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const task: QueueTask<T> = { fn, resolve, reject, priority };
            this.queue.push(task);
            this.processQueue();
        }
        );
    }   
    private async processQueue() {
        if (this.activeCount >= this.maxConcurrency) {
            return;
        }   
        if (this.queue.length === 0) {
            return;
        }
        let taskIndex = 0;
        if (this.enablePriority) {
            // Find the highest priority task (lowest priority number)
            let highestPriority = Infinity;
            for (let i = 0; i < this.queue.length; i++) {
                const task = this.queue[i];
                if (!task) continue;
                const taskPriority = task.priority ?? Infinity; 
                if (taskPriority < highestPriority) {
                    highestPriority = taskPriority;
                    taskIndex = i;
                }   
            }
        }
        const task = this.queue.splice(taskIndex, 1)[0];
        if (!task) {
            return;
        }
        this.activeCount++;
        try {
            const result = await task.fn();
            task.resolve(result);
        } catch (error) {
            task.reject(error);
        } finally {
            this.activeCount--;
            this.processQueue();
        }
    }   
    size(): number {
        return this.queue.length;
    }
}