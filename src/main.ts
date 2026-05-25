import { combinations, indexOf } from "@/data/combinations";
import { playoffMatches } from "./data/playoffs";
import rawMatches from "@/assets/matches.json";
import "./style.css";

enum Fixture {
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

function fixtureToString(fixture: Fixture): string {
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

type MatchSubscriptionCb = (match: Match) => void;

class Match {
	fixture: Fixture;
	group: string;
	team1: string;
	team2: string;
	score: [number, number] | undefined = undefined;
	private subscribtions = new Map<number, MatchSubscriptionCb>();
	private subscriptionId = 0;

	constructor(fixture: Fixture, group: string, team1: string, team2: string) {
		this.fixture = fixture;
		this.group = group;
		this.team1 = team1;
		this.team2 = team2;
	}

	setScore(score1: number, score2: number) {
		this.score = [score1, score2];
		this.notify();
	}

	private notify() {
		this.subscribtions.forEach((cb) => cb(this));
	}

	subscribe(cb: MatchSubscriptionCb): number {
		const id = this.subscriptionId++;
		this.subscribtions.set(id, cb);
		return id;
	}

	clearSubscriptions() {
		this.subscribtions.clear();
	}

	unsubscribe(id: number) {
		this.subscribtions.delete(id);
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

type GroupTeamName = GroupTeam & { name: string };

class GroupTable {
	private _teams: GroupTeamName[];
	private matches: Match[];
	public name: string;

	constructor(matches: Match[]) {
		this.matches = matches;
		const teams: Record<string, GroupTeam> = {};
		let groupName = "";
		for (const match of matches) {
			if (!teams[match.team1]) {
				teams[match.team1] = {
					played: 0,
					points: 0,
					wins: 0,
					draws: 0,
					losses: 0,
					goalsFor: 0,
					goalsAgainst: 0,
				};
			}
			if (!teams[match.team2]) {
				teams[match.team2] = {
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
				groupName = match.group;
			} else if (groupName !== match.group) {
				throw new Error("matches from different groups");
			}

			match.subscribe(() => {
				this.update();
			});
		}

		this.name = groupName;
		this._teams = Object.entries(teams).map(([name, team]) => ({
			name,
			...team,
		}));
		this.update();
	}

	private update() {
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
			const team1 = this.team(match.team1);
			const team2 = this.team(match.team2);

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

	private team(name: string): GroupTeamName | undefined {
		return this._teams.find((t) => t.name === name);
	}

	private match(team1: string, team2: string): Match | undefined {
		for (const match of this.matches) {
			if (
				(match.team1 === team1 && match.team2 === team2) ||
				(match.team1 === team2 && match.team2 === team1)
			) {
				return match;
			}
		}
		return undefined;
	}

	private sort() {
		this._teams.sort((a, b) => {
			const m = this.match(a.name, b.name);
			return sortTeams(a, b, m);
		});
	}

	place(position: number): string {
		if (position < 1 || position > Object.keys(this._teams).length) {
			throw new Error("invalid position");
		}

		return this._teams[position - 1].name;
	}

	placeData(position: number): GroupTeamName {
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
	group: string;
	position: number;
};

type Screen = "fixtures" | "groups" | "playoffs";

type Tournament = {
	matches: Match[];
	groups: GroupTable[];
};

function sortTeams(
	a: GroupTeamName,
	b: GroupTeamName,
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

		return a.name.localeCompare(b.name);
	}
	
	const m = direct;
	
	const scoreA = m.team1 === a.name ? m.score![0] : m.score![1];
	const scoreB = m.team1 === b.name ? m.score![0] : m.score![1];
	
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

	return a.name.localeCompare(b.name);
}

function parseGroupPosition(str: string): GroupPosition {
	if (str.length !== 2) {
		console.error("error parsing group position:", str);
		throw new Error("invalid group position");
	}
	if (str[0] < "1" || str[0] > "4") {
		console.error("error parsing group position:", str);
		throw new Error("invalid position");
	}
	if (str[1] < "A" || str[1] > "L") {
		console.error("error parsing group position:", str);
		throw new Error("invalid group");
	}
	return {
		group: str[1],
		position: parseInt(str[0], 10),
	};
}

function fixturesScreen(app: HTMLElement, { matches }: Tournament) {
	const localMatches = [...matches].sort((a, b) => {
		if (a.fixture === b.fixture) {
			return a.group.localeCompare(b.group);
		}
		return a.fixture - b.fixture;
	});

	let lastFixture = -1;
	let lastGroup = "";

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

			const groupHeader = document.createElement("h2");
			groupHeader.textContent = `Group ${match.group}`;
			groupHeader.classList.add("group-header");
			app.appendChild(groupHeader);
		} else if (match.group !== lastGroup) {
			const groupHeader = document.createElement("h2");
			groupHeader.textContent = `Group ${match.group}`;
			groupHeader.classList.add("group-header");
			app.appendChild(groupHeader);
		}
		lastFixture = match.fixture;
		lastGroup = match.group;

		const container = document.createElement("div");
		container.classList.add("match");

		const team1 = document.createElement("img");
		team1.src = `/flags/${match.team1.toLowerCase()}.svg`;
		team1.alt = match.team1;
		team1.classList.add("team-flag");

		const team1Score = document.createElement("input");
		team1Score.type = "number";
		team1Score.inputMode = "numeric";
		team1Score.pattern = "[0-9]*";
		team1Score.value = match.score?.[0]?.toString() || "";
		team1Score.classList.add("team-score");

		const team2 = document.createElement("img");
		team2.src = `/flags/${match.team2.toLowerCase()}.svg`;
		team2.alt = match.team2;
		team2.classList.add("team-flag");

		const team2Score = document.createElement("input");
		team2Score.value = match.score?.[1]?.toString() || "";
		team2Score.type = "number";
		team2Score.inputMode = "numeric";
		team2Score.pattern = "[0-9]*";
		team2Score.classList.add("team-score");

		const onScoreChange = () => {
			const score1 = parseInt(team1Score.value, 10);
			const score2 = parseInt(team2Score.value, 10);
			if (isNaN(score1) || isNaN(score2)) {
				return;
			}
			ogMatch.setScore(score1, score2);
			save(matches);
		};
		team1Score.addEventListener("change", onScoreChange);
		team2Score.addEventListener("change", onScoreChange);
		ogMatch.subscribe(() => {
			team1Score.value = ogMatch.score?.[0]?.toString() || "";
			team2Score.value = ogMatch.score?.[1]?.toString() || "";
		}); // let it leak

		const vs = document.createElement("span");
		vs.textContent = "vs";

		const header = document.createElement("div");
		header.classList.add("match-header");
		header.append(team1, team1Score, vs, team2Score, team2);
		container.appendChild(header);

		app.appendChild(container);
	}
}

function groupsScreen(app: HTMLElement, { groups }: Tournament) {
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

			const teamFlag = document.createElement("img");
			teamFlag.src = `/flags/${team.name.toLowerCase()}.svg`;
			teamFlag.alt = team.name;
			teamFlag.classList.add("team-flag");
			teamRow.appendChild(teamFlag);

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

function calculatePlayoffMatches({ groups }: Tournament): Match[] {
	const thirds = groups
		.map((group) => ({ team: group.placeData(3), group: group.name }))
		.sort((a, b) => sortTeams(a.team, b.team, undefined))
		.slice(0, 8)
		.map((t) => t.group)
		.sort()
		.join("");
	const combination = combinations[thirds];
	if (!combination) throw new Error("WTH! how combination was not found?");
	const playoffsByGroupPos: GroupPosition[][] = [];
	for (const playoff of playoffMatches) {
		if (playoff.length === 1) {
			const team1Pos = playoff[0];
			const team2Idx = indexOf(team1Pos);
			if (team2Idx < 0) {
				throw new Error("invalid playoff match");
			}
			const team2Pos = combination[team2Idx];
			if (!team2Pos) {
				throw new Error("invalid playoff match");
			}
			playoffsByGroupPos.push([
				parseGroupPosition(team1Pos),
				parseGroupPosition(team2Pos),
			]);
		} else if (playoff.length === 2) {
			const team1Pos = playoff[0];
			const team2Pos = playoff[1];
			playoffsByGroupPos.push([
				parseGroupPosition(team1Pos),
				parseGroupPosition(team2Pos),
			]);
		} else {
			throw new Error("invalid playoff match");
		}
	}

	const result: Match[] = [];
	for (const playoff of playoffsByGroupPos) {
		const teamPos = playoff[0];
		const group1 = groups.find((g) => g.name === teamPos.group);
		if (!group1) {
			console.error("group not found for playoff team", {
				playoff,
				teamPos,
			});
			throw new Error("invalid group");
		}
		const team1 = group1.place(teamPos.position);

		const team2 = playoff[1];
		const group2 = groups.find((g) => g.name === team2.group);
		if (!group2) {
			throw new Error("invalid group");
		}
		const team2Name = group2.place(team2.position);

		result.push(new Match(Fixture.R32, "Playoffs", team1, team2Name));
	}
	return result;
}

type Round = {
	title: string;
	matches: BracketMatch[];
	start?: boolean;
	final?: boolean;
};

type BracketMatch = {
	team1?: string;
	team2?: string;
	score?: [number, number];
};

const ROUND_ORDER = [
	Fixture.R32,
	Fixture.R16,
	Fixture.QF,
	Fixture.SF,
	Fixture.F,
];

// measurements in rem
const teamHeight = 4;
const teamGap = 0.5;
const baseMatchGap = 2;
const bracketWidth = 2;

function playoffsScreen(container: HTMLElement, matches: Tournament) {
	const playoffs = calculatePlayoffMatches(matches);

	const rounds: Round[] = ROUND_ORDER.map((fixture, index) => {
		// Real matches
		if (fixture === Fixture.R32) {
			return {
				title: fixtureToString(fixture),
				matches: playoffs.map(toBracketMatch),
				start: true,
			};
		}

		// Empty placeholder matches
		const matchCount = Math.max(1, playoffs.length / Math.pow(2, index));

		return {
			title: fixtureToString(fixture),
			final: fixture === Fixture.F,
			matches: Array.from({ length: matchCount }, () => ({})),
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

function toBracketMatch(match: Match): BracketMatch {
	return {
		team1: match.team1,
		team2: match.team2,
		score: match.score,
	};
}

const matchGapCache = new Map<number, number>();
function calculateMatchGap(roundIndex: number): number {
	if (roundIndex === 0) return baseMatchGap;
	if (matchGapCache.has(roundIndex)) {
		return matchGapCache.get(roundIndex)!;
	}
	const prevMatchGap = calculateMatchGap(roundIndex - 1);
	const matchGap = 2*prevMatchGap+2*teamHeight+teamGap;
	matchGapCache.set(roundIndex, matchGap);
	return matchGap;
}

function calculateRoundOffset(roundIndex: number): number {
	if (roundIndex === 0) return 0;
	const prevRoundOffset = calculateRoundOffset(roundIndex - 1);
	const prevMatchGap = calculateMatchGap(roundIndex - 1);
	return prevRoundOffset + 0.5*prevMatchGap + teamHeight + 0.5*teamGap;
}

function calculateBracketBackHeight(roundIndex: number): number {
	if (roundIndex === 0) return 0;
	const prevMatchGap = calculateMatchGap(roundIndex - 1);
	return 0.5*teamHeight + 0.5*prevMatchGap;
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

	console.log("Calculating measurements for round index:", roundIndex);
	matches.style.setProperty("--match-gap", `${calculateMatchGap(roundIndex)}rem`);
	matches.style.setProperty("--round-offset", `${calculateRoundOffset(roundIndex)}rem`);
	matches.style.setProperty("--bracket-back-height", `${calculateBracketBackHeight(roundIndex)}rem`);

	round.matches.forEach((match) => {
		matches.appendChild(createMatch(match));
	});

	roundEl.append(title, matches);

	return roundEl;
}

function createMatch(match: BracketMatch): HTMLElement {
	const matchEl = document.createElement("div");
	matchEl.className = "playoff-match";

	matchEl.append(
		createTeam(match.team1, match.score?.[0]),
		createTeam(match.team2, match.score?.[1]),
	);

	return matchEl;
}

function createTeam(team?: string, score?: number): HTMLElement {
	const teamEl = document.createElement("div");
	teamEl.className = "team";

	if (!team) {
		teamEl.classList.add("placeholder");
		return teamEl;
	}

	const flag = document.createElement("img");
	flag.className = "team-flag";
	flag.src = `/flags/${team.toLowerCase()}.svg`;
	flag.alt = team;

	teamEl.appendChild(flag);

	if (score !== undefined) {
		const scoreEl = document.createElement("span");
		scoreEl.className = "team-score";
		scoreEl.textContent = String(score);

		teamEl.appendChild(scoreEl);
	}

	return teamEl;
}

function save(matches: Match[]) {
	localStorage.setItem("matches", JSON.stringify(matches));
}

function validateMatch(match: any): boolean {
	const valid =
		typeof match.fixture === "number" &&
		typeof match.group === "string" &&
		typeof match.team1 === "string" &&
		typeof match.team2 === "string";
	if (!valid) return false;

	if (match.score) {
		return (
			Array.isArray(match.score) &&
			match.score.length === 2 &&
			typeof match.score[0] === "number" &&
			typeof match.score[1] === "number"
		);
	}
	return true;
}

function load(): Tournament {
	const matches = localStorage.getItem("matches");
	if (!matches) {
		const matches = rawMatches.map(
			(match) =>
				new Match(match.fixture, match.group, match.team1, match.team2),
		);
		const groups: GroupTable[] = [];
		for (const group of "ABCDEFGHIJKL") {
			const groupMatches = matches.filter(
				(match) => match.group === group,
			);
			const groupTable = new GroupTable(groupMatches);
			groups.push(groupTable);
		}
		return {
			matches,
			groups,
		};
	}

	const parsed: Match[] = JSON.parse(matches).map((match: any) => {
		if (!validateMatch(match)) {
			throw new Error("invalid match data");
		}
		const m = new Match(
			match.fixture,
			match.group,
			match.team1,
			match.team2,
		);
		if (match.score) {
			m.setScore(match.score[0], match.score[1]);
		}
		return m;
	});
	const groups: GroupTable[] = [];
	for (const group of "ABCDEFGHIJKL") {
		const groupMatches = parsed.filter((match) => match.group === group);
		const groupTable = new GroupTable(groupMatches);
		groups.push(groupTable);
	}

	// TODO: verify that all matches were found. and patch missing matches from rawMatches. and remove invalid matches. and save if any changes were made.
	return {
		matches: parsed,
		groups: groups,
	};
}

function render(
	container: HTMLElement,
	tournament: Tournament,
	screen: Screen,
) {
	container.replaceChildren();
	container.className = screen;

	switch (screen) {
		case "fixtures":
			fixturesScreen(container, tournament);
			break;
		case "groups":
			groupsScreen(container, tournament);
			break;
		case "playoffs":
			playoffsScreen(container, tournament);
			break;
		default:
			throw new Error("invalid screen");
	}
}

function removeActive(...elements: HTMLElement[]) {
	for (const element of elements) {
		element.classList.remove("active");
	}
}

function main() {
	const app = document.getElementById("app");
	if (!app) throw new Error("invalid html");

	const fixtures = document.getElementById("fixtures");
	const groups = document.getElementById("groups");
	const playoffs = document.getElementById("playoffs");
	if (!fixtures || !groups || !playoffs) throw new Error("invalid html");

	const tournament = load();

	fixtures.addEventListener("click", () => {
		removeActive(fixtures, groups, playoffs);
		fixtures.setAttribute("active", "");
		render(app, tournament, "fixtures");
	});
	groups.addEventListener("click", () => {
		removeActive(fixtures, groups, playoffs);
		groups.setAttribute("active", "");
		render(app, tournament, "groups");
	});
	playoffs.addEventListener("click", () => {
		removeActive(fixtures, groups, playoffs);
		playoffs.setAttribute("active", "");
		render(app, tournament, "playoffs");
	});

	fixtures.click();
}

main();
