// We could get the shorthands from the allTeams endpoint but honestly the
// canonical shorthands are kind of bad and if we don't like them we might as
// well save a request.
const shorthand = {
  'adc5b394-8f76-416d-9ce9-813706877b84': 'KCBM',
  '8d87c468-699a-47a8-b40d-cfb73a5660ad': 'BAL',
  'b63be8c2-576a-4d6e-8daf-814f8bcea96f': 'MIA',
  'ca3f1c8c-c025-4d8e-8eef-5be6accbeb16': 'CHI',
  '3f8bbb15-61c0-4e3f-8e4a-907a5fb1565e': 'BOS',
  '979aee4a-6d80-4863-bf1c-ee1a78e06024': 'FRI',
  '105bc3ff-1320-4e37-8ef0-8d595cb95dd0': 'SEA',
  'a37f9158-7f82-46bc-908c-c9e2dda7c33b': 'BRK',
  'b72f3061-f573-40d7-832a-5ad475bd7909': 'SF',
  '7966eb04-efcc-499b-8f03-d13916330531': 'YELL',
  '36569151-a2fb-43c1-9df7-2df512424c82': 'NY',
  'eb67ae5e-c4bf-46ca-bbbc-425cd34182ff': 'CAN',
  '23e4cbc1-e9cd-47fa-a35b-bfa06f726cb7': 'PHL',
  'bfd38797-8404-4b38-8b82-341da28b1f83': 'CHS',
  '9debc64f-74b7-4ae1-a4d6-fce0144b6ea5': 'HOU',
  'b024e975-1c4a-4575-8936-a3754a08806a': 'DAL',
  'f02aeae2-5e6a-4098-9842-02d2273f25c7': 'HELL',
  '878c1bf6-0d21-4659-bfee-916c8314d69c': 'TACO',
  '747b8e4a-7e50-4638-a973-ea7950a3e739': 'HAD',
  '57ec08cc-0411-4643-b304-0e80dbc15ac7': 'CDMX',
  'c73b705c-40ad-4633-a6ed-d357ee2e2bcf': 'TYO',
  'bb4a9de5-c924-4923-a0cb-9d1445f1ee5d': 'OHIO',
  'd9f89a8a-c563-493e-9d64-78e4f9a55d4a': 'ATLS',
  '46358869-dce9-4a01-bfba-ac24fc56f57e': 'CORE',
};

function compareGames(a, b) {
  if (!a.gameComplete && b.gameComplete) { return -1; }
  if (a.gameComplete && !b.gameComplete) { return 1; }

  if (a.id < b.id) { return -1; }
  if (a.id > b.id) { return 1; }

  return 0;
}

function ordinal(i) {
  const j = i % 10;
  const k = i % 100;

  if (j === 1 && k !== 11) {
    return `${i}st`;
  }
  if (j === 2 && k !== 12) {
    return `${i}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${i}rd`;
  }
  return `${i}th`;
}

function cloneGameTemplate() {
  const wrapper = document.getElementById('scores-wrapper');
  const clone = document.querySelector('#template-game').content.cloneNode(true);
  const gameElement = clone.querySelector('.game');
  wrapper.append(clone);
  return gameElement;
}

function cloneDayTemplate() {
  const wrapper = document.getElementById('scores-wrapper');
  const clone = document.querySelector('#template-day').content.cloneNode(true);
  const dayElement = clone.querySelector('header');
  wrapper.append(clone);
  return dayElement;
}

function emoji(e) {
  const n = Number(e);
  return Number.isNaN(n) ? e : String.fromCodePoint(n);
}

function newGame(game) {
  const gameElement = cloneGameTemplate();
  gameElement.dataset.id = game.id;

  ['away', 'home'].forEach((team) => {
    gameElement.querySelector(`.${team} .emoji`).textContent = emoji(game[`${team}TeamEmoji`]);
    const abbr = gameElement.querySelector(`.${team} abbr`);
    abbr.setAttribute('title', game[`${team}TeamName`]);
    abbr.textContent = shorthand[game[`${team}Team`]];
  });

  return gameElement;
}

function newDay(season, day) {
  const dayElement = cloneDayTemplate();

  dayElement.querySelector('.season').textContent = season;
  dayElement.querySelector('.day').textContent = day;

  return dayElement;
}

function getSalmonScore(gameId, cb) {
  const salmonURL = 'https://api.sibr.dev/chronicler/v1/games/updates?search=salmon&game=' + gameId;
  fetch(salmonURL).then((resp) => {
    if (resp.ok) {
      resp.json().then((salmonData) => {
        let salmonScore = 0;
        let salmonSwims = 0;

        salmonData.data.forEach((ev) => {
          ev = ev.data;
          salmonSwims++;

          const update = ev.lastUpdate.toLowerCase() || '';
          const match = update.match(/(\d+) of the .* runs are lost/);

          if (match) {
            salmonScore += parseInt(match[0]) || 0;
          }
        });

        cb(salmonScore, salmonSwims);
      });

    } else {
      console.error('error:', resp.status);
    }
  });
}

async function getGames(season) {
  const gamesURL = `https://api.sibr.dev/chronicler/v1/games?finished=true&season=${season-1}&weather=19&order=desc`;

  const response = await fetch(gamesURL);
  if (response.ok) {
    const gamesData = await response.json();

    // empty currently selected season's scores
    document.getElementById('scores-wrapper').replaceChildren();

    buildGame(gamesData);

  } else {
    console.error('error:', response.status);
  }
}

function buildGame(gamesData) {
  let day = null;
  //let firstPostseason = true;

  const wrapper = document.getElementById('scores-wrapper');

  const sn = document.createElement('header');
  sn.classList.add('divider');
  sn.textContent = `Season ${gamesData.data[0].data.season + 1}`;
  wrapper.append(sn);

  gamesData.data.forEach((game) => {
    game = game.data;
    let salmonScore = 0;
    let salmonSwims = 0;

    //if (game.isPostseason && firstPostseason) {
      //firstPostseason = false;
      //const ps = document.createElement('header');
      //ps.classList.add('divider');
      //ps.textContent = 'Postseason';
      //document.body.append(ps);
    //}

    if (game.day !== day) {
      day = game.day;
      newDay(game.season + 1, game.day + 1);
    }

    const gameElement = document.querySelector(`.game[data-id="${game.id}"]`) ?? newGame(game);
    if (game.gameComplete) {
      gameElement.classList.add('complete');
    }

    getSalmonScore(game.id, function(score, swims) {
      salmonScore = score;
      salmonSwims = swims;
      gameElement.querySelector('.salmon .score').textContent = salmonScore;

      // just in case there's every negative salmon runs?
      if (salmonSwims !== 0) {
        gameElement.querySelector('.salmon .swims').textContent = `${salmonSwims} 🏊`;
      }

      if (salmonScore > game.awayScore && salmonScore > game.homeScore) {
        gameElement.querySelector('.salmon').classList.add('winner-two');

      } else {
        gameElement.querySelector('.away').classList.add(game.awayScore > game.homeScore ? 'winner' : 'loser');
        gameElement.querySelector('.home').classList.add(game.awayScore < game.homeScore ? 'winner' : 'loser');

        if (salmonScore > game.awayScore || salmonScore > game.homeScore) {
          gameElement.querySelector('.salmon').classList.add('winner-two');
        }
      }

    });


    const overview = gameElement.querySelector('.overview');
    if (game.gameComplete) {
      overview.classList.remove('active');
      overview.textContent = 'Final';
      //if (game.shame) {
        //overview.classList.add('shame');
        //overview.textContent += '/SHAME';
      //}
      if (game.inning > 8) {
        overview.textContent += `/${game.inning + 1}`;
      }

    }

    ['away', 'home'].forEach((team) => {
      gameElement.querySelector(`.${team} .score`).textContent = game[`${team}Score`];
    });

  });

}

function setupSource() {
  const source = new EventSource('https://cors-proxy.blaseball-reference.com/events/streamData');

  source.addEventListener('message', (e) => {
    const event = JSON.parse(e.data).value.games;
    const postseason = Object.keys(event.postseason).length > 0;

    if (postseason) {
      document.body.classList.add('postseason');
      document.querySelector('header.postseason .season').textContent = event.sim.season + 1;
      document.querySelector('header.postseason .gameindex').textContent = event.postseason.round.gameIndex + 1;
      document.querySelector('header.postseason .phase').textContent = event.postseason.round.name;
    } else {
      document.body.classList.remove('postseason');
      document.querySelector('header.regular .season').textContent = event.sim.season + 1;
      document.querySelector('header.regular .day').textContent = event.sim.day + 1;
    }

    const schedule = event.schedule.sort(compareGames);
    const gameIds = schedule.map((g) => g.id);

    document.querySelectorAll('.game').forEach((gameElement) => {
      if (!gameIds.includes(gameElement.dataset.id)) {
        gameElement.remove();
      }
    });

    schedule.forEach((game) => {
      const gameElement = document.querySelector(`.game[data-id="${game.id}"]`) ?? newGame(game);
      if (game.gameComplete) {
        gameElement.classList.add('complete');
      }

      const overview = gameElement.querySelector('.overview');
      if (game.gameComplete) {
        overview.classList.remove('active');
        overview.textContent = 'Final';
        if (game.shame) {
          overview.classList.add('shame');
          overview.textContent += '/SHAME';
        }
        if (game.inning > 8) {
          overview.textContent += `/${game.inning + 1}`;
        }

        gameElement.querySelector('.away').classList.add(game.awayScore > game.homeScore ? 'winner' : 'loser');
        gameElement.querySelector('.home').classList.add(game.awayScore < game.homeScore ? 'winner' : 'loser');
      } else {
        overview.textContent = game.topOfInning ? '\u25b2 ' : '\u25bc ';
        if (game.shame) {
          overview.classList.add('shame');
          overview.textContent += `SHAME/${game.inning + 1}`;
        } else {
          overview.textContent += `${game.topOfInning ? 'Top' : 'Bot'} ${ordinal(game.inning + 1)}`;
        }

        gameElement.querySelector('.outs').textContent = `${game.halfInningOuts} Out`;
      }

      if (postseason) {
        const matchup = event.postseason.matchups
          .find((m) => [game.awayTeam, game.homeTeam].includes(m.awayTeam));
        const flipped = game.awayTeam !== matchup.awayTeam;

        [['away', 'home'], ['home', 'away']].forEach(([team, other]) => {
          gameElement.querySelector(`.${team} .seed`).textContent = (flipped ? matchup[`${other}Seed`] : matchup[`${team}Seed`]) + 1;
        });

        if (matchup.awayWins > 0 || matchup.homeWins > 0) {
          const extra = gameElement.querySelector('.extra');
          if (matchup.awayWins === matchup.homeWins) {
            extra.textContent = `Series tied ${matchup.awayWins}\u2013${matchup.homeWins}`;
          } else {
            const leader = (matchup.awayWins > matchup.homeWins)
              ? shorthand[matchup.awayTeam] : shorthand[matchup.homeTeam];
            const awayWins = flipped ? matchup.homeWins : matchup.awayWins;
            const homeWins = flipped ? matchup.awayWins : matchup.homeWins;
            const word = Math.abs(awayWins - homeWins) >= Number(matchup.gamesNeeded) && awayWins !== homeWins ? 'wins' : 'leads';
            extra.textContent = `${leader} ${word} ${awayWins}\u2013${homeWins}`;
          }
        }
      }

      ['away', 'home'].forEach((team) => {
        gameElement.querySelector(`.${team} .score`).textContent = game[`${team}Score`];
      });

      const bases = gameElement.querySelector('.bases');
      [['first', 0], ['second', 1], ['third', 2], ['fourth', 3]].forEach(([base, baseId]) => {
        bases.dataset[base] = game.basesOccupied.includes(baseId) ? 'true' : 'false';
      });
      bases.dataset.hasFourth = `${(game.topOfInning ? game.awayBases : game.homeBases) === 5}`;
    });
  });

  source.addEventListener('error', () => {
    source.close();
    setTimeout(setupSource, 2000);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  fetch('https://api.sibr.dev/datablase/v2/config').then((resp) => {
    if (resp.ok) {
      resp.json().then((data) => {
        const sel = document.getElementById('season-select');

        // s15 was the first with salmon weather, but seasons are 0-indexed
        for (let i = 14; i <= data.seasons.maxSeason; i++) {
          const opt = document.createElement('option');

          opt.value = `${i+1}`;
          opt.textContent = `${i+1}`;

          if (i === data.seasons.maxSeason) {
            opt.selected = true;
          }

          sel.append(opt);
        }

        sel.addEventListener('change', (evt) => {
          const opts = evt.target.getElementsByTagName('option');

          for (let i = 0; i < opts.length; i++) {
            const o = opts.item(i);

            if (o.selected) {
              getGames(o.value);
              return;
            }
          }
        });

        getGames(data.seasons.maxSeason + 1);
      });
    }
  });
});
