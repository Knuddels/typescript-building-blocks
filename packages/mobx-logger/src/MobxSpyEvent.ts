export type MobxSpyEvent =
	| MobxSpyEventAdd
	| MobxSpyEventUpdate
	| MobxSpyEventCompute
	| MobxSpyEventReaction
	| MobxSpyEventScheduledReaction
	| MobxSpyEventAction
	| MobxSpyEventEnd;

export interface MobxSpyEventStart {
	spyReportStart: true;
}

export interface MobxSpyEventAddOrUpdate extends MobxSpyEventStart {
	name: string;
	object: unknown;
	key: string;
	newValue: unknown;
}

export interface MobxSpyEventAdd extends MobxSpyEventAddOrUpdate {
	type: 'add';
}

export interface MobxSpyEventUpdate extends MobxSpyEventAddOrUpdate {
	type: 'update';
	oldValue: unknown;
}

export interface MobxSpyEventCompute {
	type: 'compute';
	name: string;
	object: unknown;
}

export interface MobxSpyEventReaction extends MobxSpyEventStart {
	type: 'reaction';
	name: string;
}

export interface MobxSpyEventScheduledReaction {
	type: 'scheduled-reaction';
	name: string;
}

export interface MobxSpyEventAction extends MobxSpyEventStart {
	type: 'action';
	name: string;
	arguments: unknown[]; // last argument is sometimes Reaction
	object: unknown;
}

export interface MobxSpyEventEnd {
	spyReportEnd: true;
	time?: number;
}
