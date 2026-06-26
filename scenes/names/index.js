const DEBUG = false;

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

const params = new URLSearchParams(window.location.search);
const id = params.get('id') ?? 1;
const placeholder = params.get('placeholder') ?? '';
const fontSize = params.get('fontSize');
const color = params.get('color');
const debug = params.get('debug');

console.log(params);

const cache = { counter: 0 };

let teams, regions;
(async () => {
  teams = await $.getJSON('../../_data/teams.json');
  regions = await $.getJSON('../../_data/regions.json');

  if (fontSize) {
    $('#name').css('font-size', `${fontSize}px`);
  }

  if (debug == 'true') {
    $('#full-overlay').css('background-color', `rgba(255, 87, 87, 0)`);
  }

  if (color) {
    $('#name').css('color', color == 'red' ? 'var(--red)' : 'var(--blue)');
  }
})();

socket.onmessage = async (event) => {
  const data = JSON.parse(event.data);
  const client = data.tourney.clients[id - 1];
	if (!client) return;

  if (teams && regions && cache.nameRed !== data.tourney.team.left) {
    cache.nameRed = data.tourney.team.left;

    const team = teams.find((t) => t.team === cache.nameRed);
    const region = regions.find((r) => r.name === team?.region);
    document.querySelector(':root').style.setProperty(`--red`, region?.color ?? '#ffffff');
  }

  if (teams && regions && cache.nameBlue !== data.tourney.team.right) {
    cache.nameBlue = data.tourney.team.right;

    const team = teams.find((t) => t.team === cache.nameBlue);
    const region = regions.find((r) => r.name === team?.region);
    document.querySelector(':root').style.setProperty(`--blue`, region?.color ?? '#ffffff');
  }

  if (cache.name !== client.user.name) {
    cache.name = client.user.name;
    $('#name').text(cache.name || placeholder);
  }

  if ((data.tourney.scoreVisible && cache.combo >= 10 && client.play.combo.current < cache.combo) || (debug && cache.counter % 20 == 0)) {
    $('#name').css('transition', 'all 100ms cubic-bezier(0, 1, 0.4, 1)');
    $('#name').css('color', 'var(--miss)');
    $('#name').css('transform', 'scale(1.1)');
    console.log('triggered combo reset');

    setTimeout(() => {
      $('#name').css('transition', 'all 500ms cubic-bezier(0.42, 0.04, 0.49, 0.97)');
      $('#name').css('color', 'var(--foreground)');
      $('#name').css('transform', 'scale(1.0)');
    }, 120);
  }

  cache.counter += 1;
  cache.combo = client.play.combo.current;
  console.log({ combo: cache.combo });
};
