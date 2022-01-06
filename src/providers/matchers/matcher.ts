import * as utils from '../../utils';

import type { Pattern, MicromatchOptions, PatternRe } from '../../types';
import type Settings from '../../settings';

export type PatternSegment = DynamicPatternSegment | StaticPatternSegment;

interface StaticPatternSegment {
	dynamic: false;
	pattern: Pattern;
}

interface DynamicPatternSegment {
	dynamic: true;
	pattern: Pattern;
	patternRe: PatternRe;
}

export type PatternSection = PatternSegment[];

export interface PatternInfo {
	/**
	 * Indicates that the pattern has a globstar (more than a single section).
	 */
	complete: boolean;
	pattern: Pattern;
	segments: PatternSegment[];
	sections: PatternSection[];
}

export default abstract class Matcher {
	protected readonly _storage: PatternInfo[] = [];

	constructor(private readonly _patterns: Pattern[], private readonly _settings: Settings, private readonly _micromatchOptions: MicromatchOptions) {
		this._fillStorage();
	}

	private _fillStorage(): void {
		/**
		 * The original pattern may include `{,*,**,a/*}`, which will lead to problems with matching (unresolved level).
		 * So, before expand patterns with brace expansion into separated patterns.
		 */
		const patterns = utils.pattern.expandPatternsWithBraceExpansion(this._patterns);

		for (const pattern of patterns) {
			const segments = this._getPatternSegments(pattern);
			const sections = this._splitSegmentsIntoSections(segments);

			this._storage.push({
				complete: sections.length <= 1,
				pattern,
				segments,
				sections
			});
		}
	}

	private _getPatternSegments(pattern: Pattern): PatternSegment[] {
		const parts = utils.pattern.getPatternParts(pattern, this._micromatchOptions);

		return parts.map((part) => {
			const dynamic = utils.pattern.isDynamicPattern(part, this._settings);

			if (!dynamic) {
				return {
					dynamic: false,
					pattern: part
				};
			}

			return {
				dynamic: true,
				pattern: part,
				patternRe: utils.pattern.makeRe(part, this._micromatchOptions)
			};
		});
	}

	private _splitSegmentsIntoSections(segments: PatternSegment[]): PatternSection[] {
		return utils.array.splitWhen(segments, (segment) => segment.dynamic && utils.pattern.hasGlobStar(segment.pattern));
	}
}
