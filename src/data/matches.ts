export enum Fixture {
	GS1 = 0,
	GS2 = 1,
	GS3 = 2,
	R32 = 3,
	R16 = 4,
	QF = 5,
	SF = 6,
	R34 = 7,
	F = 8,
}

export function fixtureToString(fixture: Fixture): string {
	switch (fixture) {
		case Fixture.GS1:
			return "Match day 1";
		case Fixture.GS2:
			return "Matchday 2";
		case Fixture.GS3:
			return "Matchday 3";
		case Fixture.R32:
			return "Round of 32";
		case Fixture.R16:
			return "Round of 16";
		case Fixture.QF:
			return "Quarter finals";
		case Fixture.SF:
			return "Semi finals";
		case Fixture.R34:
			return "Third Place Match";
		case Fixture.F:
			return "Final";
		default:
			throw new Error("invalid fixture");
	}
}

export const GROUPS = [
	"A",
	"B",
	"C",
	"D",
	"E",
	"F",
	"G",
	"H",
	"I",
	"J",
	"K",
	"L",
] as const;
export type Group = (typeof GROUPS)[number];

const GROUP_RANKINGS = [1, 2, 3, 4] as const;
export type GroupRank = (typeof GROUP_RANKINGS)[number];

export type RawMatch = {
	id: number;
	teams: [string | null, string | null];
} & (GroupStageFixture | R32Fixture | PlayoffFixture);

type GroupStageFixture = {
	fixture: Fixture.GS1 | Fixture.GS2 | Fixture.GS3;
	group: Group;
};

export type R32Team = `${GroupRank}${Group}`;

type R32Fixture = {
	fixture: Fixture.R32;
	prob1: R32Team;
	prob2: R32Team[];
};

const PLAYOFF_OUTCOME = ["W", "L"] as const;
export type PlayoffOutcome = (typeof PLAYOFF_OUTCOME)[number];

export type PlayoffTeam = `${number}-${PlayoffOutcome}`;

type PlayoffFixture = {
	fixture: Fixture.R16 | Fixture.QF | Fixture.SF | Fixture.R34 | Fixture.F;
	opp1: PlayoffTeam;
	opp2: PlayoffTeam;
};

export const DefaultMatches: RawMatch[] = [
	{ id: 1, fixture: Fixture.GS1, group: "A", teams: ["MX", "ZA"] },
	{ id: 2, fixture: Fixture.GS1, group: "A", teams: ["KR", "CZ"] },
	{ id: 3, fixture: Fixture.GS2, group: "A", teams: ["MX", "KR"] },
	{ id: 4, fixture: Fixture.GS2, group: "A", teams: ["ZA", "CZ"] },
	{ id: 5, fixture: Fixture.GS3, group: "A", teams: ["MX", "CZ"] },
	{ id: 6, fixture: Fixture.GS3, group: "A", teams: ["ZA", "KR"] },
	{ id: 7, fixture: Fixture.GS1, group: "B", teams: ["CA", "BA"] },
	{ id: 8, fixture: Fixture.GS1, group: "B", teams: ["QA", "CH"] },
	{ id: 9, fixture: Fixture.GS2, group: "B", teams: ["CA", "QA"] },
	{ id: 10, fixture: Fixture.GS2, group: "B", teams: ["BA", "CH"] },
	{ id: 11, fixture: Fixture.GS3, group: "B", teams: ["CA", "CH"] },
	{ id: 12, fixture: Fixture.GS3, group: "B", teams: ["BA", "QA"] },
	{ id: 13, fixture: Fixture.GS1, group: "C", teams: ["BR", "MA"] },
	{ id: 14, fixture: Fixture.GS1, group: "C", teams: ["HT", "GB-SCT"] },
	{ id: 15, fixture: Fixture.GS2, group: "C", teams: ["BR", "HT"] },
	{ id: 16, fixture: Fixture.GS2, group: "C", teams: ["MA", "GB-SCT"] },
	{ id: 17, fixture: Fixture.GS3, group: "C", teams: ["BR", "GB-SCT"] },
	{ id: 18, fixture: Fixture.GS3, group: "C", teams: ["MA", "HT"] },
	{ id: 19, fixture: Fixture.GS1, group: "D", teams: ["US", "PY"] },
	{ id: 20, fixture: Fixture.GS1, group: "D", teams: ["AU", "TR"] },
	{ id: 21, fixture: Fixture.GS2, group: "D", teams: ["US", "AU"] },
	{ id: 22, fixture: Fixture.GS2, group: "D", teams: ["PY", "TR"] },
	{ id: 23, fixture: Fixture.GS3, group: "D", teams: ["US", "TR"] },
	{ id: 24, fixture: Fixture.GS3, group: "D", teams: ["PY", "AU"] },
	{ id: 25, fixture: Fixture.GS1, group: "E", teams: ["DE", "CW"] },
	{ id: 26, fixture: Fixture.GS1, group: "E", teams: ["CI", "EC"] },
	{ id: 27, fixture: Fixture.GS2, group: "E", teams: ["DE", "CI"] },
	{ id: 28, fixture: Fixture.GS2, group: "E", teams: ["CW", "EC"] },
	{ id: 29, fixture: Fixture.GS3, group: "E", teams: ["DE", "EC"] },
	{ id: 30, fixture: Fixture.GS3, group: "E", teams: ["CW", "CI"] },
	{ id: 31, fixture: Fixture.GS1, group: "F", teams: ["NL", "JP"] },
	{ id: 32, fixture: Fixture.GS1, group: "F", teams: ["SE", "TN"] },
	{ id: 33, fixture: Fixture.GS2, group: "F", teams: ["NL", "SE"] },
	{ id: 34, fixture: Fixture.GS2, group: "F", teams: ["JP", "TN"] },
	{ id: 35, fixture: Fixture.GS3, group: "F", teams: ["NL", "TN"] },
	{ id: 36, fixture: Fixture.GS3, group: "F", teams: ["JP", "SE"] },
	{ id: 37, fixture: Fixture.GS1, group: "G", teams: ["BE", "EG"] },
	{ id: 38, fixture: Fixture.GS1, group: "G", teams: ["IR", "NZ"] },
	{ id: 39, fixture: Fixture.GS2, group: "G", teams: ["BE", "IR"] },
	{ id: 40, fixture: Fixture.GS2, group: "G", teams: ["EG", "NZ"] },
	{ id: 41, fixture: Fixture.GS3, group: "G", teams: ["BE", "NZ"] },
	{ id: 42, fixture: Fixture.GS3, group: "G", teams: ["EG", "IR"] },
	{ id: 43, fixture: Fixture.GS1, group: "H", teams: ["ES", "CV"] },
	{ id: 44, fixture: Fixture.GS1, group: "H", teams: ["SA", "UY"] },
	{ id: 45, fixture: Fixture.GS2, group: "H", teams: ["ES", "SA"] },
	{ id: 46, fixture: Fixture.GS2, group: "H", teams: ["CV", "UY"] },
	{ id: 47, fixture: Fixture.GS3, group: "H", teams: ["ES", "UY"] },
	{ id: 48, fixture: Fixture.GS3, group: "H", teams: ["CV", "SA"] },
	{ id: 49, fixture: Fixture.GS1, group: "I", teams: ["FR", "SN"] },
	{ id: 50, fixture: Fixture.GS1, group: "I", teams: ["IQ", "NO"] },
	{ id: 51, fixture: Fixture.GS2, group: "I", teams: ["FR", "IQ"] },
	{ id: 52, fixture: Fixture.GS2, group: "I", teams: ["SN", "NO"] },
	{ id: 53, fixture: Fixture.GS3, group: "I", teams: ["FR", "NO"] },
	{ id: 54, fixture: Fixture.GS3, group: "I", teams: ["SN", "IQ"] },
	{ id: 55, fixture: Fixture.GS1, group: "J", teams: ["AR", "DZ"] },
	{ id: 56, fixture: Fixture.GS1, group: "J", teams: ["AT", "JO"] },
	{ id: 57, fixture: Fixture.GS2, group: "J", teams: ["AR", "AT"] },
	{ id: 58, fixture: Fixture.GS2, group: "J", teams: ["DZ", "JO"] },
	{ id: 59, fixture: Fixture.GS3, group: "J", teams: ["AR", "JO"] },
	{ id: 60, fixture: Fixture.GS3, group: "J", teams: ["DZ", "AT"] },
	{ id: 61, fixture: Fixture.GS1, group: "K", teams: ["PT", "CD"] },
	{ id: 62, fixture: Fixture.GS1, group: "K", teams: ["UZ", "CO"] },
	{ id: 63, fixture: Fixture.GS2, group: "K", teams: ["PT", "UZ"] },
	{ id: 64, fixture: Fixture.GS2, group: "K", teams: ["CD", "CO"] },
	{ id: 65, fixture: Fixture.GS3, group: "K", teams: ["PT", "CO"] },
	{ id: 66, fixture: Fixture.GS3, group: "K", teams: ["CD", "UZ"] },
	{ id: 67, fixture: Fixture.GS1, group: "L", teams: ["GB-ENG", "HR"] },
	{ id: 68, fixture: Fixture.GS1, group: "L", teams: ["GH", "PA"] },
	{ id: 69, fixture: Fixture.GS2, group: "L", teams: ["GB-ENG", "GH"] },
	{ id: 70, fixture: Fixture.GS2, group: "L", teams: ["HR", "PA"] },
	{ id: 71, fixture: Fixture.GS3, group: "L", teams: ["GB-ENG", "PA"] },
	{ id: 72, fixture: Fixture.GS3, group: "L", teams: ["HR", "GH"] },
	{
		id: 73,
		fixture: Fixture.R32,
		prob1: "1E",
		prob2: ["3F", "3D", "3C", "3B", "3A"],
		teams: [null, null],
	},
	{
		id: 74,
		fixture: Fixture.R32,
		prob1: "1I",
		prob2: ["3G", "3F", "3D", "3H", "3C"],
		teams: [null, null],
	},
	{
		id: 75,
		fixture: Fixture.R32,
		prob1: "2A",
		prob2: ["2B"],
		teams: [null, null],
	},
	{
		id: 76,
		fixture: Fixture.R32,
		prob1: "1F",
		prob2: ["2C"],
		teams: [null, null],
	},
	{
		id: 77,
		fixture: Fixture.R32,
		prob1: "2K",
		prob2: ["2L"],
		teams: [null, null],
	},
	{
		id: 78,
		fixture: Fixture.R32,
		prob1: "1H",
		prob2: ["2J"],
		teams: [null, null],
	},
	{
		id: 79,
		fixture: Fixture.R32,
		prob1: "1D",
		prob2: ["3I", "3J", "3E", "3B", "3F"],
		teams: [null, null],
	},
	{
		id: 80,
		fixture: Fixture.R32,
		prob1: "1G",
		prob2: ["3H", "3J", "3I", "3E", "3A"],
		teams: [null, null],
	},
	{
		id: 81,
		fixture: Fixture.R32,
		prob1: "1C",
		prob2: ["2F"],
		teams: [null, null],
	},
	{
		id: 82,
		fixture: Fixture.R32,
		prob1: "2E",
		prob2: ["2I"],
		teams: [null, null],
	},
	{
		id: 83,
		fixture: Fixture.R32,
		prob1: "1A",
		prob2: ["3E", "3H", "3C", "3I", "3F"],
		teams: [null, null],
	},
	{
		id: 84,
		fixture: Fixture.R32,
		prob1: "1L",
		prob2: ["3K", "3I", "3E", "3J", "3H"],
		teams: [null, null],
	},
	{
		id: 85,
		fixture: Fixture.R32,
		prob1: "1J",
		prob2: ["2H"],
		teams: [null, null],
	},
	{
		id: 86,
		fixture: Fixture.R32,
		prob1: "2D",
		prob2: ["2G"],
		teams: [null, null],
	},
	{
		id: 87,
		fixture: Fixture.R32,
		prob1: "1B",
		prob2: ["3J", "3G", "3E", "3I", "3F"],
		teams: [null, null],
	},
	{
		id: 88,
		fixture: Fixture.R32,
		prob1: "1K",
		prob2: ["3L", "3I", "3E", "3D", "3J"],
		teams: [null, null],
	},
	{
		id: 99,
		fixture: Fixture.R16,
		opp1: "73-W",
		opp2: "74-W",
		teams: [null, null],
	},
	{
		id: 100,
		fixture: Fixture.R16,
		opp1: "75-W",
		opp2: "76-W",
		teams: [null, null],
	},
	{
		id: 101,
		fixture: Fixture.R16,
		opp1: "77-W",
		opp2: "78-W",
		teams: [null, null],
	},
	{
		id: 102,
		fixture: Fixture.R16,
		opp1: "79-W",
		opp2: "80-W",
		teams: [null, null],
	},
	{
		id: 103,
		fixture: Fixture.R16,
		opp1: "81-W",
		opp2: "82-W",
		teams: [null, null],
	},
	{
		id: 104,
		fixture: Fixture.R16,
		opp1: "83-W",
		opp2: "84-W",
		teams: [null, null],
	},
	{
		id: 105,
		fixture: Fixture.R16,
		opp1: "85-W",
		opp2: "86-W",
		teams: [null, null],
	},
	{
		id: 106,
		fixture: Fixture.R16,
		opp1: "87-W",
		opp2: "88-W",
		teams: [null, null],
	},
	{
		id: 107,
		fixture: Fixture.QF,
		opp1: "99-W",
		opp2: "100-W",
		teams: [null, null],
	},
	{
		id: 108,
		fixture: Fixture.QF,
		opp1: "101-W",
		opp2: "102-W",
		teams: [null, null],
	},
	{
		id: 109,
		fixture: Fixture.QF,
		opp1: "103-W",
		opp2: "104-W",
		teams: [null, null],
	},
	{
		id: 110,
		fixture: Fixture.QF,
		opp1: "105-W",
		opp2: "106-W",
		teams: [null, null],
	},
	{
		id: 111,
		fixture: Fixture.SF,
		opp1: "107-W",
		opp2: "108-W",
		teams: [null, null],
	},
	{
		id: 112,
		fixture: Fixture.SF,
		opp1: "109-W",
		opp2: "110-W",
		teams: [null, null],
	},
	{
		id: 113,
		fixture: Fixture.R34,
		opp1: "111-L",
		opp2: "112-L",
		teams: [null, null],
	},
	{
		id: 114,
		fixture: Fixture.F,
		opp1: "111-W",
		opp2: "112-W",
		teams: [null, null],
	},
];
