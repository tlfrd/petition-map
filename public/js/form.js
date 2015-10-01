(function($, PetitionMap) {
  PetitionMap.current_petition = PetitionMap.current_petition || undefined;
  PetitionMap.mp_data = PetitionMap.mp_data || undefined;
  PetitionMap.current_area = PetitionMap.current_area || undefined;
  PetitionMap.signature_buckets = PetitionMap.signature_buckets || undefined;

  var ui_hidden = false,
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

    PetitionMap.current_area = area;
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
        PetitionMap.mp_data = data;
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
        PetitionMap.current_petition = data;
        PetitionMap.signature_buckets = SignatureBuckets(data);
        updateKey(PetitionMap.signature_buckets.buckets);
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

  function updateKey(fromBuckets) {
    $('#t1').html("1 - " +  fromBuckets[1]);
    for (i = 1; i <= 6; i++) {
      $('#t' + (i + 1)).html((fromBuckets[i]+1) + " - " +  fromBuckets[i + 1]);
    }
    $('#t8').html((fromBuckets[7]+1) + " +");
  }

  function SignatureBuckets(fromPetition) {
    function getHighestCount(fromConstituencies) {
      var highest_count = 0;

      $.each(fromConstituencies, function (index, item) {
        if (item.signature_count >= highest_count) {
          highest_count = item.signature_count;
        }
      });

      return highest_count;
    }

    function extractBuckets(highestCount) {
      var goalBinSize = Math.floor(highestCount / 8)
      var roundBy = Math.pow(10, Math.floor(goalBinSize.toString().length / 2))
      var binSize = Math.round(goalBinSize/ roundBy) * roundBy;

      var buckets = {};
      for (i = 0; i <= 8; i++) {
        buckets[i] = i * binSize;
      }

      return buckets;
    }

    return {
      buckets: extractBuckets(getHighestCount(fromPetition.data.attributes.signatures_by_constituency)),
      bucketFor: function(count) {
        for(var i = 0; i < 8; i++) {
          if (count <= this.buckets[i]) {
            return i;
          }
        }
        return 8;
      }
    }
  }

  function displayPetitionInfo() {
    $('#petition_info').hide();

    var count = numberWithCommas(PetitionMap.current_petition.data.attributes.signature_count);

    var sign_link = 'https://petition.parliament.uk/petitions/' + PetitionMap.current_petition.data.id + '/signatures/new';
    var count_html = '<p class="signatures_count"><span class="data">' + count + '</span> signatures</p>';
    var sign_html = '<a class="flat_button sign" href="' + sign_link + '"><i class="fa fa-pencil"></i> Sign Petition</a>';

    var petition_details =
      '<div class="petition-details">' +
        '<h2>' + PetitionMap.current_petition.data.attributes.action + '</h2>' +
        count_html +
        '<div>' + sign_html +'</div>' +
      '</div>';

    $('#petition_info .petition-details').replaceWith(petition_details);
    $('#petition_info').show();
  }

  function changeArea() {
    spinner.spin(target);
    PetitionMap.current_area = $("input[name='area']:checked").val();
    PetitionMap.resetMapState();
    $.when(reloadMap()).then(function() {
      pushstateHandler();
    });
  }

  $("input[name='area']").on('change', changeArea);

  function reloadMap() {
    var dataFile = 'json/uk/' + PetitionMap.current_area + '/topo_wpc.json';
    return $.when(PetitionMap.loadMapData(dataFile, 'wpc')).then(function() {
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

    $(window).trigger('petitionmap:constituency-on', constituency_data);
  };

  $("#constituency").on('change', highlightConstituencyFromDropdown);

  function selectConstituencyInDropdown(_event, constituency) {
    $('#constituency option[value='+constituency.id+']').prop('selected', true);
  }
  $(window).on('petitionmap:constituency-on', selectConstituencyInDropdown);

  function displayConstituencyInfo(_event, constituency) {
    var mpForConstituency = PetitionMap.mp_data[constituency.id];

    $('#constituency_info').hide();
    $('#constituency_info').html("");
    var name, mp, count, party,
      data_found = false;
    $.each(PetitionMap.current_petition.data.attributes.signatures_by_constituency, function(i, v) {
        if (v.ons_code === constituency.id) {
            name = v.name;
            mp = v.mp;
            party = mpForConstituency.party;
            count = v.signature_count;
            data_found = true;
            return;
        }
    });
    if (!data_found) {
        name = mpForConstituency.constituency;
        mp = mpForConstituency.mp;
        party = mpForConstituency.party;
        count = "0";
    }

    $('#constituency_info').append('<h2>' + name + "</h2>");
    $('#constituency_info').append('<p class="mp">' + mp + '</p>');
    $('#constituency_info').append('<p class="party">' + party + '</p>');
    $('#constituency_info').append('<p class="signatures_count"><span class="data">' + numberWithCommas(count) + '</span> signatures</p>');
    if (!ui_hidden) {
      $('#constituency_info').show();
    }
  }

  $(window).on('petitionmap:constituency-on', displayConstituencyInfo);

  function hideConstituencyInfo(_event, _constituency) {
    //$('#constituency_info').show();
  }

  $(window).on('petitionmap:constituency-off', hideConstituencyInfo);

  function toggleFormUI() {
    if (ui_hidden) {
      $('#petition_info, #key, #controls, #constituency_info').fadeIn();
      $('#hide_ui').html("Hide UI");
      ui_hidden = false;
    } else {
      $('#petition_info, #key, #controls, #constituency_info').fadeOut();
      $('#hide_ui').html("Show UI");
      ui_hidden = true;
    }
  };

  $('#hide_ui').on('click', toggleFormUI);

  function toggleAboutUI() {
    $('#about').toggle();
  }

  $('.about-button').on('click', toggleAboutUI);

  function buildCurrentState() {
    var state = {};
    if (PetitionMap.current_petition !== undefined) {
      state.petition = PetitionMap.current_petition.data.id;
    }
    if (PetitionMap.current_area !== undefined) {
      state.area = PetitionMap.current_area;
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

  function numberWithCommas(x) {
      return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

})($, window.PetitionMap = window.PetitionMap || {});
