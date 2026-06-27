let teams, regions, mappool;
(async () => {
  $.ajaxSetup({ cache: false });
  teams = await $.getJSON('../../_data/teams.json');
  regions = await $.getJSON('../../_data/regions.json');
  mappool = await $.getJSON('../../_data/beatmaps.json');
  $('#stage').text(mappool.stage);
})();

const cache = {};

const socket = new ReconnectingWebSocket(`ws://${location.host}/websocket/v2`);
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

const update_team = (color, team) => {
  $(`#${color}_code`).text(team.code);
  $(`#${color}_name`).text(team.team);
};

socket.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (teams && (cache.points_r !== data.tourney.points.left || cache.points_b !== data.tourney.points.right)) {
    cache.points_r = data.tourney.points.left;
    cache.points_b = data.tourney.points.right;
    const red_team = teams.find((team) => team.team === data.tourney.team.left);
    const blue_team = teams.find((team) => team.team === data.tourney.team.right);

    const red_region = regions.find((r) => r.name === red_team?.region);
    const blue_region = regions.find((r) => r.name === blue_team?.region);

    if (red_region) document.querySelector(':root').style.setProperty(`--red`, red_region?.color ?? '#ffffff');
    if (blue_region) document.querySelector(':root').style.setProperty(`--blue`, blue_region?.color ?? '#ffffff');

    if (red_team && blue_team) {
      update_team('red', red_team);
      update_team('blue', blue_team);
      $('#red_score').text(cache.points_r);
      $('#blue_score').text(cache.points_b);

      if (cache.points_r > cache.points_b) {
        $('#red_score').addClass('winning');
        $('#blue_score').removeClass('winning');
      } else if (cache.points_r < cache.points_b) {
        $('#red_score').removeClass('winning');
        $('#blue_score').addClass('winning');
      } else {
        $('#red_score').removeClass('winning');
        $('#blue_score').removeClass('winning');
      }
    }
  }
};
