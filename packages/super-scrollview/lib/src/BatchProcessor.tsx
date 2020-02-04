import { runInAction } from 'mobx';

export class BatchProcessor {
	private scheduled = new Array<() => void>();

	private activeTimeout: unknown = undefined;

	constructor(private readonly batchInterval: number) {}

	public runScheduled(): boolean {
		this.activeTimeout = undefined;
		if (this.scheduled.length === 0) {
			return false;
		}
		const old = this.scheduled;
		this.scheduled = new Array<() => void>();
		runInAction('BatchProcessor.runScheduler', () => {
			for (const x of old) {
				x();
			}
		});
		return true;
	}

	public schedule(callback: () => void): void {
		this.scheduled.push(callback);

		if (!this.activeTimeout) {
			this.activeTimeout = setTimeout(
				() => this.runScheduled(),
				this.batchInterval
			);
		}
	}
}
