var current_petition,
  mp_data, // NOTE: used in map.js
  ui_hidden = false,
  spinnerOpts = {
    lines: 13,
    length: 28,
    width: 14,
    radius: 42,
    scale: 0.5,
    corners: 1,
    color: '#000',
    opacity: 0.25,
    rotate: 0,
    direction: 1,
    speed: 1,
    trail: 60,
    fps: 20,
    zIndex: 2e9,
    className: 'spinner',
    top: '50%',
    left: '50%',
    shadow: false,
    hwaccel: false
  },
  target = document.getElementById('spinner_area'),
  spinner = new Spinner(spinnerOpts).spin(target);

function populatePetitionDropdown() {
  return $.getJSON("https://petition.parliament.uk/petitions.json?state=open")
    .done(function (data) {
      var petitions = data.data;
      $.each(petitions, function (index, item) {
          var dropdown_text = item.attributes.action;
          $('#petition_dropdown').append(
              $('<option></option>').val(item.id).html(dropdown_text)
          );
      });
    });
};

$(document).ready(function() {
  $.when(populatePetitionDropdown(), loadMPData()).then(function() {
    preparePetitionAndView();
  });
});

function preparePetitionAndView() {
  var variables = getURLVariables(),
      area,
      petition_id;

  if (variables.petition !== undefined) {
    petition_id = variables.petition;
  } else {
    petition_id = $("#petition_dropdown").val();
  }

  area = 'gb';
  if (variables.area !== undefined) {
    if (possibleAreas().indexOf(variables.area) !== -1) {
      area = variables.area;
    }
  }

  $('input[name=area][value=' + area + ']').prop('checked',true);
  $('#petition_dropdown option[value=' + petition_id + ']').prop('selected', true);
  return loadPetition(petition_id, false);
}

function possibleAreas() {
  var possibleAreas = []
  $.each($('input[name=area]'), function(idx, elem) { possibleAreas[idx] = $(elem).attr('value'); });
  return possibleAreas;
}

function getURLVariables() {
  var variables = {},
    keyValuePairs = window.location.search.substring(1).split('&');

  if (keyValuePairs == "") return {};
  for (var i = 0; i < keyValuePairs.length; ++i) {
    var keyValuePair = keyValuePairs[i].split('=', 2);
    if (keyValuePair.length == 1)
      variables[keyValuePair[0]] = "";
    else
      variables[keyValuePair[0]] = decodeURIComponent(keyValuePair[1].replace(/\+/g, " "));
  }
  return variables;
};

function loadMPData() {
  return $.getJSON("json/mps/constituency_party_ons.json")
    .done(function (data) {
      mp_data = data;
      var sorted_mp_data = []
      for (a in data) {
        sorted_mp_data.push({id: a, text: data[a].constituency})
      };
      sorted_mp_data.sort(function(a, b) {
        return a.text.localeCompare(b.text);
      }),
      $.each(sorted_mp_data, function (_idx, item) {
        $('#constituency').append(
            $('<option></option>').val(item.id).html(item.text)
        );
      });
    });
}

function getPetitionUrlFromReference(petitionReference) {
  petitionReference = petitionReference.trim();
  if (petitionReference.match(/^https:\/\/petition\.parliament\.uk\/petitions\/\d+/i)) {
    return petitionReference.replace(/(\/|\.json)$/,'');
  } else if (petitionReference.match(/^\d+$/)) {
    return 'https://petition.parliament.uk/petitions/' + petitionReference;
  } else {
    return ''
  }
}

function loadPetition(petitionReference) {
  var petitionUrl = getPetitionUrlFromReference(petitionReference),
    deferredPetitionLoadedAndDrawn = new $.Deferred();

  $.getJSON(petitionUrl + '.json')
    .done(function (data) {
      current_petition = data;
      $.when(reloadMap()).then(function () {
        deferredPetitionLoadedAndDrawn.resolve();
      }, function() {
        deferredPetitionLoadedAndDrawn.reject();
      });
    })
    .fail(function() {
      alert('Petition not found! (Looking for: '+petitionReference+')');
      deferredPetitionLoadedAndDrawn.reject();
    });

  return deferredPetitionLoadedAndDrawn;
}

function displayPetitionInfo() {
  $('#petition_info').hide();

  var count = number_with_commas(current_petition.data.attributes.signature_count);

  var sign_link = 'https://petition.parliament.uk/petitions/' + current_petition.data.id + '/signatures/new';
  var count_html = '<p class="signatures_count"><span class="data">' + count + '</span> signatures</p>';
  var sign_html = '<a class="flat_button sign" href="' + sign_link + '"><i class="fa fa-pencil"></i> Sign Petition</a>';

  var petition_details =
    '<div class="petition-details">' +
      '<h2>' + current_petition.data.attributes.action + '</h2>' +
      count_html +
      '<div>' + sign_html +'</div>' +
    '</div>';

  $('#petition_info .petition-details').replaceWith(petition_details);
  $('#petition_info').show();
}

function changeArea() {
  spinner.spin(target);
  reset();
  $.when(reloadMap()).then(function() {
    pushstateHandler();
  });
}

$("input[name='area']").on('change', changeArea);

function reloadMap() {
  var area = $("input[name='area']:checked").val();
    dataFile = 'json/uk/' + area + '/topo_wpc.json';
  return $.when(loadData(dataFile, 'wpc')).then(function() {
    displayPetitionInfo();
    $('#key').fadeIn();
    spinner.stop();
  });
}

function showPetitionFromDropdown() {
  spinner.spin(target);

  var petition_id = $("#petition_dropdown").val()

  $.when(loadPetition(petition_id)).then(function() {
    pushstateHandler();
  });
};

$("#petition_dropdown").on('change', showPetitionFromDropdown);

function showPetitionFromUrlInput() {
  spinner.spin(target);

  var petition_url = $('#petition_url').val()

  $.when(loadPetition(petition_url)).then(function() {
    pushstateHandler();
  });
};

$('#petition_button').on('click', showPetitionFromUrlInput);

function highlightConstituencyFromDropdown() {
  var ons_code = $("#constituency").val(),
    constituency_data = {
      "id": ons_code
    };

  select(constituency_data);
};

$("#constituency").on('change', highlightConstituencyFromDropdown);

function toggleFormUI() {
  if (ui_hidden) {
    $('#petition_info').fadeIn();
    $('#key').fadeIn();
    $('#hide_ui').html("Hide UI");
    ui_hidden = false;
  } else {
    $('#petition_info').fadeOut();
    $('#key').fadeOut();
    $('#hide_ui').html("Show UI");
    ui_hidden = true;
  }
};

$('#hide_ui').on('click', toggleFormUI);

function buildCurrentState() {
  var area = $("input[name='area']:checked").val(),
    state = {};
  if (current_petition !== undefined) {
    state.petition = current_petition.data.id;
  }
  if (area !== undefined) {
    state.area = area;
  }
  return state;
}

function buildCurrentURL(state) {
  var new_url = document.createElement('a'),
    search = '?';

  for(key in state) {
    search += '' + key + '=' + encodeURIComponent(state[key]) + '&';
  }

  new_url.href = window.location.href
  new_url.search = search.slice(0,-1);

  return new_url.href;
}

function pushstateHandler() {
  var state = buildCurrentState();
  if (history.pushState) {
    var url = buildCurrentURL(state);
    history.pushState(state, '', url);
  }
};

function popstateHandler() {
  if (history.state && (history.state.area || history.state.petitionId)) {
    preparePetitionAndView();
  }
};

$(window).on('popstate', popstateHandler);
