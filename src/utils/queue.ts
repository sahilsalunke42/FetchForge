
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