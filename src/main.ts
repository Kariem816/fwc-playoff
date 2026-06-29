import { combinations, indexOf } from "@/data/combinations";
import teamData from "@/assets/teams.json";
import "./style.css";
import {
	DefaultMatches,
	Fixture,
	fixtureToString,
	GROUPS,
	type Group,
	type GroupRank,
	type PlayoffTeam,
	type R32Team,
	type RawMatch,
} from "./data/matches";

const tournament: Tournament = {
	matches: [],
	groups: [],
};

let app = document.getElementById("app");
if (!app) throw new Error("invalid html");

class Match {
	private data: RawMatch;
	score: [number, number] | undefined = undefined;
	penalties: [number, number] | undefined = undefined;
	private notifyActive = false;

	constructor(data: RawMatch) {
		this.data = { ...data };
	}

	setScore(score1: number, score2: number) {
		this.score = [score1, score2];
		this.notify();
	}

	setPenalties(score1: number, score2: number) {
		if (!this.shouldHavePenalties()) return;
		this.penalties = [score1, score2];
		this.notify();
	}

	shouldHavePenalties() {
		if (this.data.fixture < Fixture.R32) return false;
		if (!this.score) return false;
		if (this.score[0] !== this.score[1]) return false;
		return true;
	}

	get id() {
		return this.data.id;
	}

	get fixture() {
		return this.data.fixture;
	}

	get group() {
		return "group" in this.data ? this.data.group : undefined;
	}

	get team1() {
		return this.data.teams[0]
			? teamData[this.data.teams[0] as keyof typeof teamData]
			: teamData["TBD"];
	}

	get team2() {
		return this.data.teams[1]
			? teamData[this.data.teams[1] as keyof typeof teamData]
			: teamData["TBD"];
	}

	get prob1(): R32Team | undefined {
		return "prob1" in this.data ? this.data.prob1 : undefined;
	}

	get prob2(): R32Team[] | undefined {
		return "prob2" in this.data ? this.data.prob2 : undefined;
	}

	get opp1(): PlayoffTeam | undefined {
		return "opp1" in this.data ? this.data.opp1 : undefined;
	}

	get opp2(): PlayoffTeam | undefined {
		return "opp2" in this.data ? this.data.opp2 : undefined;
	}

	get result(): MatchResult | undefined {
		if (!this.score) {
			return undefined;
		}

		return {
			id: this.data.id,
			score: this.score,
		};
	}

	get done(): boolean {
		return !!this.score;
	}

	get victor(): string | undefined {
		if (!this.score) return undefined;
		if (this.score[0] === this.score[1]) {
			if (!this.penalties) return undefined;
			if (this.penalties[0] === this.penalties[1]) {
				throw new Error(
					"invalid match state: draw with equal penalties",
				);
			}

			if (this.penalties[0] > this.penalties[1]) {
				return this.team1.id;
			}
			return this.team2.id;
		}

		if (this.score[0] > this.score[1]) {
			return this.team1.id;
		}
		return this.team2.id;
	}

	get loser(): string | undefined {
		if (!this.score) return undefined;
		if (this.score[0] === this.score[1]) {
			if (!this.penalties) return undefined;
			if (this.penalties[0] === this.penalties[1]) {
				throw new Error(
					"invalid match state: draw with equal penalties",
				);
			}

			if (this.penalties[0] > this.penalties[1]) {
				return this.team2.id;
			}
			return this.team1.id;
		}

		if (this.score[0] > this.score[1]) {
			return this.team2.id;
		}
		return this.team1.id;
	}

	setTeams(team1: string, team2: string) {
		this.data.teams = [team1, team2];
	}

	public setNotifyActive() {
		this.notifyActive = true;
	}

	private notify() {
		if (!this.notifyActive) return;
		updateTournament(tournament, this.data.fixture);
	}
}

type GroupTeam = {
	played: number;
	points: number;
	wins: number;
	draws: number;
	losses: number;
	goalsFor: number;
	goalsAgainst: number;
};

type GroupTeamId = GroupTeam & { id: string };

class GroupTable {
	private _teams: GroupTeamId[];
	private matches: Match[];
	public name: string;
	private thirdQualified: boolean = false;

	constructor(matches: Match[]) {
		this.matches = matches;
		const teams: Record<string, GroupTeam> = {};
		let groupName = "";
		for (const match of matches) {
			if (!teams[match.team1.id]) {
				teams[match.team1.id] = {
					played: 0,
					points: 0,
					wins: 0,
					draws: 0,
					losses: 0,
					goalsFor: 0,
					goalsAgainst: 0,
				};
			}
			if (!teams[match.team2.id]) {
				teams[match.team2.id] = {
					played: 0,
					points: 0,
					wins: 0,
					draws: 0,
					losses: 0,
					goalsFor: 0,
					goalsAgainst: 0,
				};
			}

			if (!groupName) {
				groupName = match.group!;
			} else if (groupName !== match.group) {
				throw new Error("matches from different groups");
			}
		}

		this.name = groupName;
		this._teams = Object.entries(teams).map(([id, team]) => ({
			id,
			...team,
		}));
		this.update();
	}

	public update() {
		for (const team of this._teams) {
			team.played = 0;
			team.points = 0;
			team.wins = 0;
			team.draws = 0;
			team.losses = 0;
			team.goalsFor = 0;
			team.goalsAgainst = 0;
		}

		for (const match of this.matches) {
			const team1 = this.team(match.team1.id);
			const team2 = this.team(match.team2.id);

			if (!team1 || !team2) {
				throw new Error("invalid match teams");
			}

			if (match.score) {
				team1.played++;
				team2.played++;

				team1.goalsFor += match.score[0];
				team1.goalsAgainst += match.score[1];

				team2.goalsFor += match.score[1];
				team2.goalsAgainst += match.score[0];

				if (match.score[0] > match.score[1]) {
					team1.points += 3;
					team1.wins++;
					team2.losses++;
				} else if (match.score[0] < match.score[1]) {
					team2.points += 3;
					team2.wins++;
					team1.losses++;
				} else {
					team1.points += 1;
					team2.points += 1;
					team1.draws++;
					team2.draws++;
				}
			}
		}
		this.sort();
	}

	public setThird(qualified: boolean) {
		this.thirdQualified = qualified;
	}

	public qualified(id: string): boolean {
		const teamRank = this._teams.findIndex((t) => t.id === id);
		switch (teamRank) {
			case 0:
			case 1:
				return true;
			case 2:
				return this.thirdQualified;
			default:
				return false;
		}
	}

	private team(id: string): GroupTeamId | undefined {
		return this._teams.find((t) => t.id === id);
	}

	private match(team1: string, team2: string): Match | undefined {
		for (const match of this.matches) {
			if (
				(match.team1.id === team1 && match.team2.id === team2) ||
				(match.team1.id === team2 && match.team2.id === team1)
			) {
				return match;
			}
		}
		return undefined;
	}

	private sort() {
		this._teams.sort((a, b) => {
			const m = this.match(a.id, b.id);
			return sortTeams(a, b, m);
		});
	}

	place(position: number): string {
		if (position < 1 || position > Object.keys(this._teams).length) {
			throw new Error("invalid position");
		}

		return this._teams[position - 1].id;
	}

	placeData(position: number): GroupTeamId {
		if (position < 1 || position > Object.keys(this._teams).length) {
			throw new Error("invalid position");
		}

		return this._teams[position - 1];
	}

	get teams() {
		return this._teams;
	}
}

type GroupPosition = {
	group: Group;
	rank: GroupRank;
};

type Screen = "matches" | "groups" | "playoffs";

type Tournament = {
	matches: Match[];
	groups: GroupTable[];
};

let currentScreen: Screen = "matches";

function updateTournament(
	tournament: Tournament,
	updatedMatchFixture: Fixture,
) {
	save(tournament.matches);
	if (updatedMatchFixture < Fixture.R32) {
		tournament.groups.forEach((g) => g.update());
	}
	calculatePlayoffMatches();
	render();
}

function sortTeams(
	a: GroupTeamId,
	b: GroupTeamId,
	direct: Match | undefined,
): number {
	if (a.points !== b.points) {
		return b.points - a.points;
	}

	if (!direct || !direct.score) {
		const gda = a.goalsFor - a.goalsAgainst;
		const gdb = b.goalsFor - b.goalsAgainst;

		if (gda !== gdb) {
			return gdb - gda;
		}

		if (a.goalsFor !== b.goalsFor) {
			return b.goalsFor - a.goalsFor;
		}

		return a.id.localeCompare(b.id);
	}

	const m = direct;

	const scoreA = m.team1.id === a.id ? m.score![0] : m.score![1];
	const scoreB = m.team1.id === b.id ? m.score![0] : m.score![1];

	if (scoreA !== scoreB) {
		return scoreB - scoreA;
	}

	const gda = a.goalsFor - a.goalsAgainst;
	const gdb = b.goalsFor - b.goalsAgainst;

	if (gda !== gdb) {
		return gdb - gda;
	}

	if (a.goalsFor !== b.goalsFor) {
		return b.goalsFor - a.goalsFor;
	}

	// TODO: replace with clean play rules and/or FIFA rankings
	return a.id.localeCompare(b.id);
}

function parseGroupPosition(str: R32Team): GroupPosition {
	return {
		group: str[1] as Group,
		rank: parseInt(str[0], 10) as GroupRank,
	};
}

function matchesScreen(app: HTMLElement) {
	const matches = tournament.matches;
	const localMatches = [...matches].sort((a, b) => {
		if (a.fixture === b.fixture) {
			return a.id - b.id;
		}
		return a.fixture - b.fixture;
	});

	let lastFixture = -1;

	for (const match of localMatches) {
		const ogMatch = matches.find(
			(m) => m.team1 === match.team1 && m.team2 === match.team2,
		);
		if (!ogMatch) {
			throw new Error("match not found");
		}
		if (match.fixture !== lastFixture) {
			const fixtureHeader = document.createElement("h2");
			fixtureHeader.textContent = fixtureToString(match.fixture);
			fixtureHeader.classList.add("fixture-header");
			app.appendChild(fixtureHeader);

			lastFixture = match.fixture;
		}

		const container = document.createElement("div");
		container.classList.add("match");

		if (match.group) {
			const group = document.createElement("span");
			group.textContent = `Group ${match.group}`;
			group.classList.add("match-group");
			container.appendChild(group);
		}

		const team1 = match.team1;
		const team2 = match.team2;

		const label1 = document.createElement("span");
		label1.textContent = team1.name;
		label1.classList.add("team-label");

		const label2 = document.createElement("span");
		label2.textContent = team2.name;
		label2.classList.add("team-label");

		const flag1 = document.createElement("img");
		flag1.src = team1.flag;
		flag1.alt = team1.name;
		flag1.classList.add("team-flag");

		const flag2 = document.createElement("img");
		flag2.src = team2.flag;
		flag2.alt = team2.name;
		flag2.classList.add("team-flag");

		const score1El = document.createElement("input");
		score1El.type = "number";
		score1El.inputMode = "numeric";
		score1El.pattern = "[0-9]*";
		score1El.value = match.score?.[0]?.toString() || "";
		score1El.classList.add("team-score");
		score1El.id = `score-${match.id}-1`;

		const score2El = document.createElement("input");
		score2El.value = match.score?.[1]?.toString() || "";
		score2El.type = "number";
		score2El.inputMode = "numeric";
		score2El.pattern = "[0-9]*";
		score2El.classList.add("team-score");
		score2El.id = `score-${match.id}-2`;

		if (team1.id === "TBD" || team2.id === "TBD") {
			score1El.disabled = true;
			score2El.disabled = true;
		}

		const onScoreChange = () => {
			const score1 = parseInt(score1El.value, 10);
			const score2 = parseInt(score2El.value, 10);
			if (isNaN(score1) || isNaN(score2)) {
				return;
			}
			ogMatch.setScore(score1, score2);
		};
		score1El.addEventListener("change", onScoreChange);
		score2El.addEventListener("change", onScoreChange);

		const vs = document.createElement("span");
		vs.textContent = "vs";

		const header = document.createElement("div");
		header.classList.add("match-header");

		if (match.shouldHavePenalties()) {
			const pins1El = document.createElement("input");
			pins1El.type = "number";
			pins1El.inputMode = "numeric";
			pins1El.pattern = "[0-9]*";
			pins1El.value = match.penalties?.[0]?.toString() || "";
			pins1El.classList.add("team-score", "pins", "hidden");
			pins1El.id = `pins-${match.id}-1`;

			const pins2El = document.createElement("input");
			pins2El.type = "number";
			pins2El.inputMode = "numeric";
			pins2El.pattern = "[0-9]*";
			pins2El.value = match.penalties?.[1]?.toString() || "";
			pins2El.classList.add("team-score", "pins", "hidden");
			pins2El.id = `pins-${match.id}-2`;

			const onPinsChange = () => {
				const pins1 = parseInt(pins1El.value, 10);
				const pins2 = parseInt(pins2El.value, 10);
				if (isNaN(pins1) || isNaN(pins2)) {
					return;
				}
				match.setPenalties(pins1, pins2);
			};
			pins1El.addEventListener("change", onPinsChange);
			pins2El.addEventListener("change", onPinsChange);
			header.append(
				label1,
				flag1,
				score1El,
				pins1El,
				vs,
				pins2El,
				score2El,
				flag2,
				label2,
			);
		} else {
			header.append(label1, flag1, score1El, vs, score2El, flag2, label2);
		}

		// TODO: add btn to reset score
		container.appendChild(header);

		app.appendChild(container);
	}
}

function groupsScreen(app: HTMLElement) {
	const groups = tournament.groups;
	for (const groupTable of groups) {
		const container = document.createElement("div");
		container.classList.add("group-container");
		app.appendChild(container);

		const groupHeader = document.createElement("h2");
		groupHeader.textContent = `Group ${groupTable.name}`;
		groupHeader.classList.add("group-header");
		container.appendChild(groupHeader);

		const table = document.createElement("div");
		table.classList.add("group-table");
		container.appendChild(table);

		const headerRow = document.createElement("div");
		headerRow.classList.add("group-table-row", "group-table-header");
		table.appendChild(headerRow);
		for (const label of [
			"",
			"Team",
			"P",
			"W",
			"D",
			"L",
			"GF",
			"GA",
			"GD",
			"Pts",
		]) {
			const span = document.createElement("span");
			span.textContent = label;
			headerRow.appendChild(span);
		}

		for (const team of groupTable.teams) {
			const teamRow = document.createElement("div");
			teamRow.classList.add("group-table-row");
			table.appendChild(teamRow);

			const qualified = document.createElement("span");
			qualified.textContent = "↓";
			qualified.classList.add("team-qualified");
			teamRow.appendChild(qualified);

			if (groupTable.qualified(team.id)) {
				qualified.textContent = "↑";
			} else {
				qualified.classList.add("home");
			}

			const teamDatum = teamData[team.id as keyof typeof teamData];

			const teamInfo = document.createElement("div");
			teamInfo.classList.add("team-info");

			const teamFlag = document.createElement("img");
			teamFlag.src = teamDatum.flag;
			teamFlag.alt = teamDatum.name;
			teamFlag.classList.add("team-flag");
			teamInfo.appendChild(teamFlag);

			const teamLabel = document.createElement("span");
			teamLabel.textContent = teamDatum.name;
			teamLabel.classList.add("team-label");
			teamInfo.appendChild(teamLabel);

			teamRow.appendChild(teamInfo);

			const tdPlayed = document.createElement("td");
			tdPlayed.textContent = team.played.toString();
			teamRow.appendChild(tdPlayed);

			const tdWins = document.createElement("td");
			tdWins.textContent = team.wins.toString();
			teamRow.appendChild(tdWins);

			const tdDraws = document.createElement("td");
			tdDraws.textContent = team.draws.toString();
			teamRow.appendChild(tdDraws);

			const tdLosses = document.createElement("td");
			tdLosses.textContent = team.losses.toString();
			teamRow.appendChild(tdLosses);

			const tdGoalsFor = document.createElement("td");
			tdGoalsFor.textContent = team.goalsFor.toString();
			teamRow.appendChild(tdGoalsFor);

			const tdGoalsAgainst = document.createElement("td");
			tdGoalsAgainst.textContent = team.goalsAgainst.toString();
			teamRow.appendChild(tdGoalsAgainst);

			const tdGoalsDifference = document.createElement("td");
			tdGoalsDifference.textContent = (
				team.goalsFor - team.goalsAgainst
			).toString();
			teamRow.appendChild(tdGoalsDifference);

			const tdPoints = document.createElement("td");
			tdPoints.textContent = team.points.toString();
			teamRow.appendChild(tdPoints);
		}
	}
}

function teamIdByPos(pos: GroupPosition, groups: GroupTable[]): string {
	const group = groups.find((g) => g.name === pos.group);
	if (!group) {
		throw new Error("WTH! group is not found.");
	}
	return group.place(pos.rank);
}

type Opponent = {
	matchId: number;
	victor: boolean;
};

function parseOpponent(opp: PlayoffTeam): Opponent {
	const [id, s] = opp.split("-");
	const matchId = parseInt(id, 10);
	const victor = s === "W";
	return {
		matchId,
		victor,
	};
}

function calculatePlayoffMatches() {
	const { matches, groups } = tournament;
	groups.forEach((g) => g.setThird(false));
	const thirds = groups
		.map((group) => ({
			team: group.placeData(3),
			group: group.name,
			g: group,
		}))
		.sort((a, b) => sortTeams(a.team, b.team, undefined))
		.slice(0, 8)
		.map((t) => t.group)
		.sort()
		.join("");
	thirds.split("").forEach((l) => {
		const g = groups.find((g) => g.name === l)!;
		g.setThird(true);
	});

	const combination = combinations[thirds];
	if (!combination) throw new Error("WTH! how combination was not found?");

	const r32Matches = matches.filter((m) => m.fixture === Fixture.R32);
	for (const match of r32Matches) {
		const prob1 = match.prob1;
		const prob2 = match.prob2;
		if (!prob1 || !prob2) {
			throw new Error("R32 matches have no probs");
		}

		if (prob2.length === 1) {
			match.setTeams(
				teamIdByPos(parseGroupPosition(prob1), groups),
				teamIdByPos(parseGroupPosition(prob2[0]), groups),
			);
		} else {
			const team2Idx = indexOf(prob1);
			if (team2Idx < 0) {
				throw new Error("invalid playoff match");
			}
			const team2Pos = combination[team2Idx];
			if (!team2Pos) {
				throw new Error("invalid playoff match");
			}
			match.setTeams(
				teamIdByPos(parseGroupPosition(prob1), groups),
				teamIdByPos(parseGroupPosition(team2Pos), groups),
			);
		}
	}

	for (const round of ROUND_ORDER) {
		if (round === Fixture.R32) continue;
		const roundMatches = matches.filter((m) => m.fixture === round);
		for (const match of roundMatches) {
			const opp1 = match.opp1;
			const opp2 = match.opp2;
			if (!opp1 || !opp2) {
				throw new Error("playoff match has no opponents");
			}
			const opponent1 = parseOpponent(opp1);
			const opponent2 = parseOpponent(opp2);

			const team1Match = matches.find((m) => opponent1.matchId === m.id);
			const team2Match = matches.find((m) => opponent2.matchId === m.id);
			if (!team1Match || !team2Match) {
				throw new Error("Playoff match teams have no origin");
			}

			const team1 = opponent1.victor
				? team1Match.victor
				: team1Match.loser;
			const team2 = opponent2.victor
				? team2Match.victor
				: team2Match.loser;

			match.setTeams(team1 || "TBD", team2 || "TBD");
		}
	}
}

type Round = {
	title: string;
	matches: Match[];
	start?: boolean;
	final?: boolean;
};

const ROUND_ORDER = [
	Fixture.R32,
	Fixture.R16,
	Fixture.QF,
	Fixture.SF,
	Fixture.R34,
	Fixture.F,
];

// measurements in rem
const teamHeight = 4;
const teamGap = 0.5;
const baseMatchGap = 2;
const bracketWidth = 2;

function playoffsScreen(container: HTMLElement) {
	// TODO: render R34 match
	const rounds: Round[] = ROUND_ORDER.filter(
		(fixture) => fixture !== Fixture.R34,
	).map((fixture) => {
		return {
			title: fixtureToString(fixture),
			matches: tournament.matches.filter((m) => m.fixture === fixture),
			start: fixture === Fixture.R32,
			final: fixture === Fixture.F,
		};
	});

	const bracket = document.createElement("div");
	bracket.classList.add("bracket");
	bracket.style.setProperty("--team-height", `${teamHeight}rem`);
	bracket.style.setProperty("--team-gap", `${teamGap}rem`);
	bracket.style.setProperty("--bracket-width", `${bracketWidth}rem`);

	for (let i = 0; i < rounds.length; i++) {
		calculateMatchGap(i);
	}

	rounds.forEach((round, roundIndex) => {
		bracket.appendChild(createRound(round, roundIndex));
	});

	container.appendChild(bracket);
}

const matchGapCache = new Map<number, number>();
function calculateMatchGap(roundIndex: number): number {
	if (roundIndex === 0) return baseMatchGap;
	if (matchGapCache.has(roundIndex)) {
		return matchGapCache.get(roundIndex)!;
	}
	const prevMatchGap = calculateMatchGap(roundIndex - 1);
	const matchGap = 2 * prevMatchGap + 2 * teamHeight + teamGap;
	matchGapCache.set(roundIndex, matchGap);
	return matchGap;
}

function calculateRoundOffset(roundIndex: number): number {
	if (roundIndex === 0) return 0;
	const prevRoundOffset = calculateRoundOffset(roundIndex - 1);
	const prevMatchGap = calculateMatchGap(roundIndex - 1);
	return prevRoundOffset + 0.5 * prevMatchGap + teamHeight + 0.5 * teamGap;
}

function calculateBracketBackHeight(roundIndex: number): number {
	if (roundIndex === 0) return 0;
	const prevMatchGap = calculateMatchGap(roundIndex - 1);
	return 0.5 * teamHeight + 0.5 * prevMatchGap;
}

function createRound(round: Round, roundIndex: number): HTMLElement {
	const roundEl = document.createElement("section");
	roundEl.classList.add("round");

	if (round.start) {
		roundEl.classList.add("start");
	}
	if (round.final) {
		roundEl.classList.add("final");
	}

	const title = document.createElement("h2");
	title.className = "round-title";
	title.textContent = round.title;

	const matches = document.createElement("div");
	matches.className = "round-matches";

	matches.style.setProperty(
		"--match-gap",
		`${calculateMatchGap(roundIndex)}rem`,
	);
	matches.style.setProperty(
		"--round-offset",
		`${calculateRoundOffset(roundIndex)}rem`,
	);
	matches.style.setProperty(
		"--bracket-back-height",
		`${calculateBracketBackHeight(roundIndex)}rem`,
	);

	round.matches.forEach((match) => {
		matches.appendChild(createMatch(match));
	});

	roundEl.append(title, matches);

	return roundEl;
}

function createMatch(match: Match): HTMLElement {
	const matchEl = document.createElement("div");
	matchEl.className = "playoff-match";

	const team1El = createTeam(match.team1);
	const team2El = createTeam(match.team2);

	const score1El = document.createElement("input");
	score1El.type = "number";
	score1El.inputMode = "numeric";
	score1El.pattern = "[0-9]*";
	score1El.value = match.score?.[0]?.toString() || "";
	score1El.classList.add("team-score");
	score1El.id = `score-${match.id}-1`;
	team1El.appendChild(score1El);

	const score2El = document.createElement("input");
	score2El.value = match.score?.[1]?.toString() || "";
	score2El.type = "number";
	score2El.inputMode = "numeric";
	score2El.pattern = "[0-9]*";
	score2El.classList.add("team-score");
	score2El.id = `score-${match.id}-2`;

	if (match.team1.id === "TBD" || match.team2.id === "TBD") {
		score1El.disabled = true;
		score2El.disabled = true;
	}

	team2El.appendChild(score2El);

	const onScoreChange = () => {
		const score1 = parseInt(score1El.value, 10);
		const score2 = parseInt(score2El.value, 10);
		if (isNaN(score1) || isNaN(score2)) {
			return;
		}
		match.setScore(score1, score2);
	};
	score1El.addEventListener("change", onScoreChange);
	score2El.addEventListener("change", onScoreChange);

	if (match.shouldHavePenalties()) {
		const pins1El = document.createElement("input");
		pins1El.type = "number";
		pins1El.inputMode = "numeric";
		pins1El.pattern = "[0-9]*";
		pins1El.value = match.penalties?.[0]?.toString() || "";
		pins1El.classList.add("team-score", "pins", "hidden");
		pins1El.id = `pins-${match.id}-1`;
		team1El.appendChild(pins1El);

		const pins2El = document.createElement("input");
		pins2El.type = "number";
		pins2El.inputMode = "numeric";
		pins2El.pattern = "[0-9]*";
		pins2El.value = match.penalties?.[1]?.toString() || "";
		pins2El.classList.add("team-score", "pins", "hidden");
		pins2El.id = `pins-${match.id}-2`;
		team2El.appendChild(pins2El);

		const onPinsChange = () => {
			const pins1 = parseInt(pins1El.value, 10);
			const pins2 = parseInt(pins2El.value, 10);
			if (isNaN(pins1) || isNaN(pins2)) {
				return;
			}
			match.setPenalties(pins1, pins2);
		};
		pins1El.addEventListener("change", onPinsChange);
		pins2El.addEventListener("change", onPinsChange);
	}

	matchEl.append(team1El, team2El);

	return matchEl;
}

function createTeam(
	team?: (typeof teamData)[keyof typeof teamData],
): HTMLElement {
	const teamEl = document.createElement("div");
	teamEl.className = "team";

	if (!team) {
		teamEl.classList.add("placeholder");
		return teamEl;
	}

	const label = document.createElement("span");
	label.className = "team-label";
	label.textContent = team.name;
	teamEl.appendChild(label);

	const flag = document.createElement("img");
	flag.className = "team-flag";
	flag.src = team.flag;
	flag.alt = team.name;
	teamEl.appendChild(flag);

	return teamEl;
}

function save(matches: Match[]) {
	localStorage.setItem(
		"results",
		JSON.stringify(
			matches.map((match) => match.result).filter((res) => !!res),
		),
	);
}

type MatchResult = {
	id: number;
	score: [number, number];
};

function validateResult(res: any): res is MatchResult {
	return (
		typeof res.id === "number" &&
		typeof res.score === "object" &&
		Array.isArray(res.score) &&
		res.score.length === 2 &&
		typeof res.score[0] === "number" &&
		typeof res.score[1] === "number"
	);
}

function load() {
	DefaultMatches.forEach((match) => {
		tournament.matches.push(new Match(match));
	});

	for (const group of GROUPS) {
		const groupMatches = tournament.matches.filter(
			(match) => match.group === group,
		);
		const groupTable = new GroupTable(groupMatches);
		tournament.groups.push(groupTable);
	}

	const rawResults = localStorage.getItem("results");
	if (!rawResults) {
		return;
	}

	let results: MatchResult[] = [];
	try {
		const parsed = JSON.parse(rawResults);
		if (!Array.isArray(parsed)) {
			throw new Error("invalid results data");
		}
		for (const result of parsed) {
			if (!validateResult(result)) {
				throw new Error("invalid result data");
			}
		}
		results = parsed;
	} catch (e) {
		console.error("error parsing results from localStorage", e);
		return;
	}
	for (const result of results) {
		const match = tournament.matches.find((m) => m.id === result.id);
		if (!match) {
			console.error("match not found for result", result);
			continue;
		}
		match.setScore(result.score[0], result.score[1]);
	}
}

function render() {
	const container = app!;

	container.replaceChildren();
	container.className = currentScreen;

	switch (currentScreen) {
		case "matches":
			matchesScreen(container);
			break;
		case "groups":
			groupsScreen(container);
			break;
		case "playoffs":
			playoffsScreen(container);
			break;
		default:
			throw new Error("invalid screen");
	}
}

function createSetActiveHandler(...btns: HTMLElement[]) {
	return (event: Event) => {
		const target = event.currentTarget as HTMLElement;
		for (const btn of btns) {
			btn.classList.remove("active");
		}
		target.classList.add("active");
	};
}

function main() {
	const matches = document.getElementById("matches");
	const groups = document.getElementById("groups");
	const playoffs = document.getElementById("playoffs");
	if (!matches || !groups || !playoffs) throw new Error("invalid html");

	load();
	tournament.matches.forEach((match) => match.setNotifyActive());
	updateTournament(tournament, Fixture.GS1);

	const setActiveHandler = createSetActiveHandler(matches, groups, playoffs);

	matches.addEventListener("click", (e) => {
		setActiveHandler(e);
		currentScreen = "matches";
		render();
		scrollTo({ top: 0, left: 0, behavior: "smooth" });
	});
	groups.addEventListener("click", (e) => {
		setActiveHandler(e);
		currentScreen = "groups";
		render();
		scrollTo({ top: 0, left: 0, behavior: "smooth" });
	});
	playoffs.addEventListener("click", (e) => {
		setActiveHandler(e);
		currentScreen = "playoffs";
		render();
		scrollTo({ top: 0, left: 0, behavior: "smooth" });
	});

	matches.click();
}

main();
