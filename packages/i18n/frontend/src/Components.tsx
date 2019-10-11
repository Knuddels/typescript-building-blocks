import * as React from 'react';
import { Model } from './Model';
import classnames = require('classnames');
import { observer, disposeOnUnmount } from 'mobx-react';
import {
	scopeType,
	localizedFormatPackageType,
	formatType,
} from '@format-editor/cli';
import { InputGroup, Spinner, Icon } from '@blueprintjs/core';
import { observable } from 'mobx';

@observer
export class GUI extends React.Component<{ model: Model }, {}> {
	render() {
		const model = this.props.model;

		const conState = model.connectionState;
		return (
			<div className={'gui'}>
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
					<ScopesViewer
						model={this.props.model}
						scopes={model.data}
					/>
				)}
			</div>
		);
	}
}

export class ScopesViewer extends React.Component<{
	scopes: (typeof scopeType['_A'])[];
	model: Model;
}> {
	render() {
		const s = this.props.scopes;
		return (
			<div className="component-ScopesViewer">
				{s.map(scope => (
					<ScopeViewer
						key={scope.name}
						model={this.props.model}
						scope={scope}
					/>
				))}
			</div>
		);
	}
}

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
	@observable format = this.props.format;

	async updateFormat() {
		this.updating = true;
		await this.props.model.updateFormat(
			this.props.scopeName,
			this.props.lang,
			this.props.formatId,
			this.format
		);
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
						onChange={(v: any) => (this.format = v.target.value)}
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
