import * as React from 'react';
import { Model, DiagnosticInfo } from './Model';
import classnames = require('classnames');
import { observer, disposeOnUnmount } from 'mobx-react';
import { Select, MultiSelect, ItemRenderer } from '@blueprintjs/select';
import {
	scopeType,
	localizedFormatPackageType,
	FormatDeclarationData,
	DiagnosticData,
} from '@knuddels/i18n-cli';
import {
	InputGroup,
	Spinner,
	Icon,
	Navbar,
	Alignment,
	Button,
	Callout,
	Tabs,
	Tab,
	MenuItem,
	FormGroup,
	Tag,
	Card,
	Checkbox,
	ButtonGroup,
	AnchorButton,
	Menu,
	Popover,
} from '@blueprintjs/core';
import { observable, ObservableSet, runInAction } from 'mobx';
import { CustomMultiSelect } from './CustomMultiSelect';

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
	render() {
		const model = this.props.model;

		const conState = model.connectionState;
		return (
			<div className="component-GUI">
				{conState.kind !== 'connected' && (
					<div className="status">
						<div>
							{conState.kind === 'error'
								? `Could not connect to server`
								: conState.kind}
						</div>
					</div>
				)}
				{!model.data ? (
					<div>Waiting for data</div>
				) : (
					<ConnectedGui model={model} data={model.data} />
				)}
			</div>
		);
	}
}

function flatMap<T, TResult>(
	arr: T[],
	selector: (item: T) => TResult[]
): TResult[] {
	return new Array<TResult>().concat(...arr.map(item => selector(item)));
}

@observer
export class ConnectedGui extends React.Component<{
	data: (typeof scopeType['_A'])[];
	model: Model;
}> {
	render() {
		const model = this.props.model;
		const data = this.props.data;
		return (
			<div className="component-ConnectedGui">
				<Navbar>
					<Navbar.Group align={Alignment.LEFT}>
						<Navbar.Heading>I18n Format Editor</Navbar.Heading>
						<Navbar.Divider />
						<Tabs
							id="TabsExample"
							selectedTabId={model.activePanel}
							onChange={e =>
								runInAction(
									'Update tab',
									() => (model.activePanel = e as any)
								)
							}
						>
							<Tab id="Formats" title="Formats" />
							<Tab id="CodeIssues">
								Code Issues{' '}
								{model.diagnostics.length > 0 && (
									<Tag intent="danger" round={true}>
										{model.diagnostics.length}
									</Tag>
								)}
							</Tab>
						</Tabs>
					</Navbar.Group>
				</Navbar>
				<div className="part-Panel">
					{model.activePanel === 'Formats' && (
						<ScopesViewer model={this.props.model} scopes={data} />
					)}
					{model.activePanel === 'CodeIssues' && (
						<CodeIssuesComponent model={model} />
					)}
				</div>
			</div>
		);
	}
}

@observer
export class CodeIssuesComponent extends React.Component<{
	model: Model;
}> {
	render() {
		const { model } = this.props;
		return (
			<div>
				<div style={{ marginTop: '0px' }}>
					<Callout title="Options">
						<div style={{ display: 'flex' }}>
							<Button
								intent="primary"
								onClick={() => model.fixSelected()}
							>
								Fix selected
							</Button>
							<div style={{ width: 4 }} />
							<Button
								onClick={() =>
									runInAction('Select all', () => {
										for (const d of model.diagnosticInfos) {
											d.selected = true;
										}
									})
								}
							>
								Select All
							</Button>
							<div style={{ width: 4 }} />
							<Button
								onClick={() =>
									runInAction('Deselect all', () => {
										for (const d of model.diagnosticInfos) {
											d.selected = false;
										}
									})
								}
							>
								Deselect All
							</Button>
						</div>
					</Callout>
				</div>

				{model.diagnosticInfos.map((d, idx) => (
					<DiagnosticComponent
						key={idx}
						diagnostic={d}
						model={model}
					/>
				))}
			</div>
		);
	}
}

@observer
export class DiagnosticComponent extends React.Component<{
	model: Model;
	diagnostic: DiagnosticInfo;
}> {
	render() {
		const diag = this.props.diagnostic;
		const model = this.props.model;
		return (
			<div className="component-Diagnostic" style={{ margin: 10 }}>
				<Callout
					intent="danger"
					icon={undefined}
					style={{
						display: 'flex',
						alignItems: 'baseline',
						flexWrap: 'wrap',
					}}
				>
					{this.renderDiagnostic2(diag.diagnostic)}

					{diag.defaultAction && (
						<ButtonGroup style={{ marginLeft: 'auto' }}>
							<Button
								icon="take-action"
								active={diag.selected}
								onClick={() =>
									runInAction(
										'Toggle action selection',
										() => {
											diag.selected = !diag.selected;
										}
									)
								}
							/>
							<Button
								onClick={() =>
									this.props.model.applyActions([
										diag.defaultAction!,
									])
								}
							>
								{diag.defaultAction.title}
							</Button>
							{diag.diagnostic.fixes.length > 1 && (
								<Popover
									position="bottom-left"
									content={
										<Menu>
											{diag.diagnostic.fixes.map(
												(action, idx) => (
													<MenuItem
														key={action.id}
														text={action.title}
														onClick={() =>
															runInAction(
																'Set idx',
																() =>
																	(diag.defaultActionIdx = idx)
															)
														}
													/>
												)
											)}
										</Menu>
									}
								>
									<Button icon={'caret-down'} />
								</Popover>
							)}
						</ButtonGroup>
					)}
				</Callout>
			</div>
		);
	}

	renderDiagnostic2(diag: DiagnosticData) {
		switch (diag.kind) {
			case 'missingFormat':
				return (
					<>
						<span className="title">Missing Format</span>
						<span>
							Format
							<span className="component-marked">
								{diag.declaration.formatId}
							</span>
							is missing in scope
							<span className="component-marked">
								{diag.package.scopeName}
							</span>
							for language
							<span className="component-marked">
								{diag.package.lang}
							</span>
						</span>
					</>
				);
			case 'emptyFormat':
				return (
					<span>
						<span className="title">Empty Format</span>
						Format
						<span className="component-marked">
							{diag.format.formatId}
						</span>
						in scope
						<span className="component-marked">
							{diag.format.scopeName}
						</span>
						for language
						<span className="component-marked">
							{diag.format.lang}
						</span>
						is empty.
					</span>
				);
			case 'unknownFormat':
				return (
					<span>
						<span className="title">Unknown Format</span>
						Format
						<span className="component-marked">
							{diag.format.formatId}
						</span>
						in scope
						<span className="component-marked">
							{diag.format.scopeName}
						</span>
						for language
						<span className="component-marked">
							{diag.format.lang}
						</span>
						is not used in code.
					</span>
				);
			case 'formatDeclarationWithoutScope':
				return <div>formatDeclarationWithoutScope</div>;
			case 'duplicateFormatDeclaration':
				return <div>duplicateFormatDeclaration</div>;
			case 'diffingDefaultFormats':
				return (
					<>
						<span className="title">
							Conflicting Default Formats
						</span>
						<span>
							Format
							<span className="component-marked">
								{diag.format.formatId}
							</span>
							in scope
							<span className="component-marked">
								{diag.format.scopeName}
							</span>
							has default format
							<span className="component-marked">
								{diag.declaration.defaultFormat}
							</span>{' '}
							but format
							<span className="component-marked">
								{diag.format.format}
							</span>
							in default language.
						</span>
					</>
				);
			case 'missingDefaultFormat':
				return (
					<span>
						<span className="title">Missing Default Format</span>
					</span>
				);
		}
	}
}

@observer
export class ScopesViewer extends React.Component<{
	scopes: (typeof scopeType['_A'])[];
	model: Model;
}> {
	render() {
		const s = this.props.scopes;
		const model = this.props.model;
		return (
			<div className="component-ScopesViewer">
				<div style={{ marginTop: '0px' }}>
					<Callout title="Options">
						<div style={{ display: 'flex' }}>
							<FormGroup
								label="Scopes"
								style={{ marginRight: '10px' }}
							>
								<CustomMultiSelect<typeof scopeType['_A']>
									items={s}
									selectedItems={model.filteredScopes}
									nameFn={e => e.name}
								/>
							</FormGroup>
							<FormGroup label="Languages">
								<CustomMultiSelect<string>
									items={[
										...new Set(
											flatMap(s, d =>
												d.packages.map(p => p.lang)
											)
										),
									]}
									selectedItems={model.filteredLanguages}
									nameFn={e => e}
								/>
							</FormGroup>
						</div>
					</Callout>
				</div>
				<div className="part-Scopes">
					{s.map(
						scope =>
							this.props.model.shouldShowScope(scope) && (
								<ScopeViewer
									key={scope.name}
									model={this.props.model}
									scope={scope}
								/>
							)
					)}
				</div>
			</div>
		);
	}
}

@observer
export class ScopeViewer extends React.Component<{
	scope: typeof scopeType['_A'];
	model: Model;
}> {
	render() {
		const s = this.props.scope;
		const def = this.props.scope.packages.find(
			p => p.lang === s.defaultLang
		)!;
		return (
			<div className="component-ScopeViewer">
				<h1>{s.name}</h1>
				{s.packages.map(p => (
					<PackageViewer
						model={this.props.model}
						key={p.lang}
						scopeName={s.name}
						package={p}
						defaultPackage={def}
					/>
				))}
			</div>
		);
	}
}

@observer
export class PackageViewer extends React.Component<{
	scopeName: string;
	package: typeof localizedFormatPackageType['_A'];
	defaultPackage: typeof localizedFormatPackageType['_A'];
	model: Model;
}> {
	render() {
		const pkg = this.props.package;
		return (
			<div className="component-PackageViewer">
				<h2>{pkg.lang}</h2>
				{pkg.formats.map(format => {
					const def = this.props.defaultPackage.formats.find(
						f => f.id === format.id
					);
					return (
						<FormatViewer
							key={format.id}
							scopeName={this.props.scopeName}
							lang={pkg.lang}
							model={this.props.model}
							formatId={format.id}
							format={format.format}
							defaultFormat={def ? def.format! : '(none)'}
						/>
					);
				})}
			</div>
		);
	}
}

@observer
export class FormatViewer extends React.Component<{
	scopeName: string;
	lang: string;
	formatId: string;
	format: string | null;
	defaultFormat: string;
	model: Model;
}> {
	@observable updating = false;
	@observable editedFormat: string | null | undefined = undefined;
	get format(): string | null {
		return this.editedFormat || this.props.format;
	}

	async updateFormat() {
		if (this.editedFormat === undefined) {
			return;
		}
		this.updating = true;
		await this.props.model.updateFormat(
			this.props.scopeName,
			this.props.lang,
			this.props.formatId,
			this.editedFormat
		);
		this.editedFormat = undefined;
		this.updating = false;
	}

	render() {
		const { formatId, defaultFormat } = this.props;
		return (
			<div className="component-FormatViewer">
				<div className="header">
					<span className="id">{formatId}</span>
					<span className="default">{defaultFormat}</span>
				</div>
				<div className="format">
					<InputGroup
						value={this.format!}
						onChange={(v: any) =>
							(this.editedFormat = v.target.value)
						}
						onBlur={() => this.updateFormat()}
						onKeyDown={evt => {
							if (evt.keyCode === 13) {
								// enter
								this.updateFormat();
							}
						}}
						rightElement={
							this.updating ? (
								<Spinner size={Icon.SIZE_STANDARD} />
							) : (
								undefined
							)
						}
					/>
				</div>
			</div>
		);
	}
}
