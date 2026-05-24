import { combinations, indexOf } from "@/data/combinations";
import { playoffMatches } from "./data/playoffs";
import rawMatches from "@/assets/matches.json";
import "./style.css";

class Match {
	fixture: number;
	group: string;
	team1: string;
	team2: string;
	score: [number, number] | undefined = undefined;

	constructor(fixture: number, group: string, team1: string, team2: string) {
		this.fixture = fixture;
		this.group = group;
		this.team1 = team1;
		this.team2 = team2;
	}

	setScore(score1: number, score2: number) {
		this.score = [score1, score2];
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

			const team1 = teams[match.team1];
			const team2 = teams[match.team2];

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

		this.name = groupName;
		this._teams = Object.entries(teams).map(([name, team]) => ({
			name,
			...team,
		}));
		this.sort();
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

function fixturesScreen(app: HTMLElement, matches: Match[]) {
	const localMatches = [...matches].sort((a, b) => {
		if (a.fixture === b.fixture) {
			return a.group.localeCompare(b.group);
		}
		return a.fixture - b.fixture;
	});

	let lastFixture = -1;
	let lastGroup = "";

	for (const match of localMatches) {
		if (match.fixture !== lastFixture) {
			const fixtureHeader = document.createElement("h2");
			fixtureHeader.textContent = `Fixture ${match.fixture}`;
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

		const team2 = document.createElement("img");
		team2.src = `/flags/${match.team2.toLowerCase()}.svg`;
		team2.alt = match.team2;
		team2.classList.add("team-flag");

		const vs = document.createElement("span");
		vs.textContent = "vs";

		const header = document.createElement("div");
		header.classList.add("match-header");
		header.append(team1, vs, team2);
		container.appendChild(header);

		app.appendChild(container);
	}
}

function groupsScreen(app: HTMLElement, matches: Match[]) {
	for (const charCode of Array.from({ length: 12 }, (_, i) => i + 65)) {
		const group = String.fromCharCode(charCode);
		const groupMatches = matches.filter((match) => match.group === group);

		const groupTable = new GroupTable(groupMatches);

		const container = document.createElement("div");
		container.classList.add("group-container");
		app.appendChild(container);

		const groupHeader = document.createElement("h2");
		groupHeader.textContent = `Group ${group}`;
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

function calculatePlayoffMatches(matches: Match[]): Match[] {
	const groups: GroupTable[] = [];
	for (const charCode of Array.from({ length: 12 }, (_, i) => i + 65)) {
		const group = String.fromCharCode(charCode);
		const groupMatches = matches.filter((match) => match.group === group);

		const groupTable = new GroupTable(groupMatches);
		groups.push(groupTable);
	}
	const thirds = groups
		.map((group) => ({ team: group.placeData(3), group: group.name }))
		.sort((a, b) => sortTeams(a.team, b.team, undefined))
		.slice(0, 8)
    .map((t) => t.group)
    .sort()
		.join("");
  console.log("thirds:", thirds);
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
      playoffsByGroupPos.push([parseGroupPosition(team1Pos), parseGroupPosition(team2Pos)]);
		} else if (playoff.length === 2) {
			const team1Pos = playoff[0];
			const team2Pos = playoff[1];
      playoffsByGroupPos.push([parseGroupPosition(team1Pos), parseGroupPosition(team2Pos)]);
		} else {
			throw new Error("invalid playoff match");
		}
	}

	const result: Match[] = [];
	for (const playoff of playoffsByGroupPos) {
		const teamPos = playoff[0];
		const group1 = groups.find((g) => g.name === teamPos.group);
		if (!group1) {
      console.error("group not found for playoff team", {playoff, teamPos});
			throw new Error("invalid group");
		}
		const team1 = group1.place(teamPos.position);

		const team2 = playoff[1];
		const group2 = groups.find((g) => g.name === team2.group);
		if (!group2) {
			throw new Error("invalid group");
		}
		const team2Name = group2.place(team2.position);

		result.push(new Match(0, "", team1, team2Name));
	}
	return result;
}

function playoffsScreen(container: HTMLElement, matches: Match[]) {
	const playoffs = calculatePlayoffMatches(matches);

	for (const playoff of playoffs) {
		const matchContainer = document.createElement("div");
		matchContainer.classList.add("playoff-match");
		container.appendChild(matchContainer);

		const team1 = playoff.team1;
		const team2 = playoff.team2;

		const team1Flag = document.createElement("img");
		team1Flag.src = `/flags/${team1.toLowerCase()}.svg`;
		team1Flag.alt = team1;
		team1Flag.classList.add("team-flag");
		const team2Flag = document.createElement("img");
		team2Flag.src = `/flags/${team2.toLowerCase()}.svg`;
		team2Flag.alt = team2;
		team2Flag.classList.add("team-flag");

		const vs = document.createElement("span");
		vs.textContent = "vs";

		const header = document.createElement("div");
		header.classList.add("match-header");
		header.append(team1Flag, vs, team2Flag);
		matchContainer.appendChild(header);
	}
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

function load(): Match[] {
	const matches = localStorage.getItem("matches");
	if (!matches)
		return rawMatches.map(
			(match) =>
				new Match(match.fixture, match.group, match.team1, match.team2),
		);
	const parsed = JSON.parse(matches).map((match: any) => {
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

	// TODO: verify that all matches were found. and patch missing matches from rawMatches. and remove invalid matches. and save if any changes were made.
	return parsed;
}

function render(container: HTMLElement, matches: Match[], screen: Screen) {
	container.replaceChildren();
	container.className = screen;

	switch (screen) {
		case "fixtures":
			fixturesScreen(container, matches);
			break;
		case "groups":
			groupsScreen(container, matches);
			break;
		case "playoffs":
			playoffsScreen(container, matches);
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

	const matches = load();

	fixtures.addEventListener("click", () => {
		removeActive(fixtures, groups, playoffs);
		fixtures.setAttribute("active", "");
		render(app, matches, "fixtures");
	});
	groups.addEventListener("click", () => {
		removeActive(fixtures, groups, playoffs);
		groups.setAttribute("active", "");
		render(app, matches, "groups");
	});
	playoffs.addEventListener("click", () => {
		removeActive(fixtures, groups, playoffs);
		playoffs.setAttribute("active", "");
		render(app, matches, "playoffs");
	});

	fixtures.click();
}

main();
