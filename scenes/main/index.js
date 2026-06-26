const TEAMSIZE = 3;
const DEBUG = false;

const cache = {};
const timer = {
  in_progress: false,
  object: null,
  object_blink: null,
};

const params = new URLSearchParams(window.location.search);
const pool_mode_param = params.get('mappool') ?? 'false';
const pool_mode = pool_mode_param.toLowerCase() === 'true';

let mappool, teams, regions;
(async () => {
  $.ajaxSetup({ cache: false });
  mappool = await $.getJSON('../../_data/beatmaps.json');
  teams = await $.getJSON('../../_data/teams.json');
  regions = await $.getJSON('../../_data/regions.json');
  let stage = mappool.stage;
  if (stage) $('#stage_name').text(stage);

  if (pool_mode) {
    $('#points_container').css('opacity', 0);
  }
})();

const socket = new ReconnectingWebSocket(DEBUG ? 'ws://127.0.0.1:24051/' : `ws://${location.host}/websocket/v2`);
socket.onopen = () => {
  console.log('Successfully Connected');
};
socket.onclose = (event) => {
  console.log('Socket Closed Connection: ', event);
  socket.send('Client Closed!');
};
socket.onerror = (error) => {
  console.log('Socket Error: ', error);
};

const animation = {
  red_score: new CountUp('red_score', 0, 0, 0, 0.3, {
    useEasing: true,
    useGrouping: true,
    separator: ',',
    decimal: '.',
    suffix: '',
  }),
  blue_score: new CountUp('blue_score', 0, 0, 0, 0.3, {
    useEasing: true,
    useGrouping: true,
    separator: ',',
    decimal: '.',
    suffix: '',
  }),
  score_diff: new CountUp('score_diff', 0, 0, 0, 0.3, {
    useEasing: true,
    useGrouping: true,
    separator: ',',
    decimal: '.',
    suffix: '',
  }),
};

socket.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  const now = Date.now();

  if (cache.scoreVisible !== data.tourney.scoreVisible) {
    cache.scoreVisible = data.tourney.scoreVisible;

    if (cache.scoreVisible && !pool_mode) {
      $('#red_score_container').css('opacity', 1);
      $('#blue_score_container').css('opacity', 1);
      $('#score_diff_container').css('opacity', 1);
    } else {
      $('#red_score_container').css('opacity', 0);
      $('#blue_score_container').css('opacity', 0);
      $('#score_diff_container').css('opacity', 0);
    }
  }

  if (cache.starsVisible !== data.tourney.starsVisible) {
    cache.starsVisible = data.tourney.starsVisible;
    if (cache.starsVisible && !pool_mode) {
      $('#points_container').css('opacity', 1);
    } else {
      $('#points_container').css('opacity', 0);
    }
  }

  if (teams && regions && cache.nameRed !== data.tourney.team.left) {
    cache.nameRed = data.tourney.team.left || 'Red Team';
    $('#red_name').text(cache.nameRed);
    const team = teams.find((t) => t.team === cache.nameRed);

    const region = regions.find(r => r.name === team?.region);
    document.querySelector(':root').style.setProperty(`--red`, region?.color ?? '#ffffff');

    $('#red_score_title').text(`${cache.nameRed} SCORE`);
    $('#red_code').text(team?.code ?? 'RED');
    $('#red_seed').text('#' + (team?.seed ?? 0));
  }

  if (teams && regions && cache.nameBlue !== data.tourney.team.right) {
    cache.nameBlue = data.tourney.team.right || 'Blue Team';
    $('#blue_name').text(cache.nameBlue);
    const team = teams.find((t) => t.team === cache.nameBlue);

    const region = regions.find(r => r.name === team?.region);
    document.querySelector(':root').style.setProperty(`--blue`, region?.color ?? '#ffffff');

    $('#blue_score_title').text(`${cache.nameBlue} SCORE`);
    $('#blue_code').text(team?.code ?? 'BLU');
    $('#blue_seed').text('#' + (team?.seed ?? 0));
  }

  if (cache.bestOf !== data.tourney.bestOF) {
    const newmax = Math.ceil(data.tourney.bestOF / 2);
    if (cache.bestOf === undefined) {
      for (let i = 1; i <= newmax; i++) {
        $('#red_points').append($('<div></div>').attr('id', `red${i}`).addClass('team-point red'));
        $('#blue_points').append($('<div></div>').attr('id', `blue${i}`).addClass('team-point blue'));
      }
    } else if (cache.bestOf < data.tourney.bestOF) {
      for (let i = cache.firstTo + 1; i <= newmax; i++) {
        $('#red_points').append($('<div></div>').attr('id', `red${i}`).addClass('team-point red'));
        $('#blue_points').append($('<div></div>').attr('id', `blue${i}`).addClass('team-point blue'));
      }
    } else {
      for (let i = firstTo; i > newmax; i--) {
        $(`#red${i}`).remove();
        $(`#blue${i}`).remove();
      }
    }
    cache.bestOf = data.tourney.bestOF;
    cache.firstTo = newmax;

    $('#red_points_max').text(cache.firstTo);
    $('#blue_points_max').text(cache.firstTo);
  }

  if (cache.starsRed !== data.tourney.points.left) {
    cache.starsRed = data.tourney.points.left;
    for (let i = 1; i <= cache.starsRed; i++) {
      $(`#red${i}`).addClass('filled');
    }
    for (let i = cache.starsRed + 1; i <= cache.firstTo; i++) {
      $(`#red${i}`).removeClass('filled');
    }
    $('#red_points_current').text(cache.starsRed);
  }

  if (cache.starsBlue !== data.tourney.points.right) {
    cache.starsBlue = data.tourney.points.right;
    for (let i = 1; i <= cache.starsBlue; i++) {
      $(`#blue${i}`).addClass('filled');
    }
    for (let i = cache.starsBlue + 1; i <= cache.firstTo; i++) {
      $(`#blue${i}`).removeClass('filled');
    }
    $('#blue_points_current').text(cache.starsBlue);
  }

  if (mappool && cache.md5 !== data.beatmap.checksum) {
    cache.md5 = data.beatmap.checksum;
    setTimeout(() => {
      cache.update_stats = true;
    }, 250);
  }

  if (cache.update_stats) {
    cache.update_stats = false;
    cache.mapid = data.beatmap.id;
    cache.map = mappool
      ? (mappool.beatmaps.find((m) => m.beatmap_id === cache.mapid || m.md5 === cache.md5) ?? {
          id: cache.mapid,
          mods: 'NM',
          identifier: null,
        })
      : { id: null, mods: 'NM', identifier: null };

    $('#now_playing').text(`${data.beatmap.artist} - ${data.beatmap.title} [${data.beatmap.version}]`);
  }

  if (cache.scoreVisible) {
    const scores = [];
    for (let i = 0; i < TEAMSIZE * 2; i++) {
      let score = data.tourney.clients[i]?.play?.score || 0;
      if (data.tourney.clients[i]?.play?.mods?.name?.toUpperCase().includes('EZ')) {
        score *= cache.map?.ez_mult || 1;
      }

      scores.push({ id: i, score });
    }

    cache.scoreRed = scores
      .filter((s) => s.id < TEAMSIZE)
      .map((s) => s.score)
      .reduce((a, b) => a + b);

    cache.scoreBlue = scores
      .filter((s) => s.id >= TEAMSIZE)
      .map((s) => s.score)
      .reduce((a, b) => a + b);

    // cache.scoreRed = 1665624;
    // cache.scoreBlue = 796743;
    const scorediff = Math.abs(cache.scoreRed - cache.scoreBlue);

    animation.red_score.update(cache.scoreRed);
    animation.blue_score.update(cache.scoreBlue);
    animation.score_diff.update(scorediff);

    if (cache.scoreRed > cache.scoreBlue) {
      $('#score_diff_container').removeClass('blue').addClass('red');
    } else if (cache.scoreBlue > cache.scoreRed) {
      $('#score_diff_container').removeClass('red').addClass('blue');
    } else {
      $('#score_diff_container').removeClass('red blue');
    }
  }
};
