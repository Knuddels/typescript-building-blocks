export type MobxSpyEvent =
	| MobxSpyEventAdd
	| MobxSpyEventUpdate
	| MobxSpyEventDelete
	| MobxSpyEventCompute
	| MobxSpyEventReaction
	| MobxSpyEventScheduledReaction
	| MobxSpyEventAction
	| MobxSpyEventEnd;

export interface MobxSpyEventStart {
	spyReportStart: true;
}

export interface MobxSpyEventAddOrUpdateOrDelete extends MobxSpyEventStart {
	name: string;
	object: unknown;
	key: string;
}

export interface MobxSpyEventAdd extends MobxSpyEventAddOrUpdateOrDelete {
	type: 'add';
	newValue: unknown;
}

export interface MobxSpyEventUpdate extends MobxSpyEventAddOrUpdateOrDelete {
	type: 'update';
	newValue: unknown;
	oldValue: unknown;
}

export interface MobxSpyEventDelete extends MobxSpyEventAddOrUpdateOrDelete {
	type: 'delete';
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
