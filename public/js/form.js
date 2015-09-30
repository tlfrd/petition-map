var current_petition;
var mp_data;
var ui_hidden = false;

var opts = {
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
}

var target = document.getElementById('spinner_area')
var spinner = new Spinner(opts).spin(target);

$(document).ready(function() {
    $.getJSON("https://petition.parliament.uk/petitions.json?state=open", function (data) {
        var petitions = data.data;
        $.each(petitions, function (index, item) {
            var dropdown_text = item.attributes.action;
            $('#petition_dropdown').append(
                $('<option></option>').val(item.id).html(dropdown_text)
            );
        });

        load_mp_data();

        prepareInitialPetitionAndView();
    });
});

function prepareInitialPetitionAndView() {
  var variables = getURLVariables(),
      area,
      petition_id;

  if (variables.petition !== undefined) {
    petition_id = variables.petition;
  } else {
    petition_id = $("#petition_dropdown").val();
  }

  if (variables.area !== undefined) {
    area = variables.area;
  } else {
    area = 'gb';
  }

  $("input[name='area'][value=" + variables.area + "]").prop("checked",true);
  $('#petition_dropdown').val(petition_id);
  load_petition(petition_id, false);
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

function load_mp_data() {
    $.getJSON("json/mps/constituency_party_ons.json", function (data) {
        mp_data = data;
        var sorted_mp_data = []
        for (a in data) {
            sorted_mp_data.push({id: a, text: data[a].constituency}) };
        sorted_mp_data.sort(function(a, b) {
            return a.text.localeCompare(b.text);
        }),
        $.each(sorted_mp_data,
            function (_idx, item) {
                $('#constituency').append(
                    $('<option></option>').val(item.id).html(item.text)
                );
            }
        );
    });
}

function load_petition(petition_id, is_url) {
    var petition;
    if (is_url) {
        petition = petition_id;
    } else {
        petition = "https://petition.parliament.uk/petitions/" + petition_id;
    }

    $.getJSON(petition + ".json", function (data) {
        current_petition = data;
        display_petition_info(petition_id);
        reload_map();
    })
    .fail(function() {
        alert("Petition not found!");
    });
}

function display_petition_info() {
    $('#hide_petition_info').prop('checked', false);

    $('#petition_info').hide();
    $('#petition_info').empty();
    $('#petition_info').append('<table></table>');

    var count = number_with_commas(current_petition.data.attributes.signature_count);

    var sign_link = "https://petition.parliament.uk/petitions/" + current_petition.data.id + "/signatures/new";
    var count_html = "<span id=\"data_count\">" + count + "</span>";
    var sign_html = "<a class=\"flat_button sign\" href='" + sign_link + "'><i class=\"fa fa-pencil\"></i> Sign Petition</a>";

    $('#petition_info').append(
        $('<tr></tr>').html("<div id=\"petition_action\">" + current_petition.data.attributes.action + "<div>")
    );
    $('#petition_info').append(
      $('<tr></tr>').html("</br><div>" + count_html + " <span id=\"signatures\">signatures</span></div>")
    );
    $('#petition_info').append(
      $('<tr></tr>').html("</br>" + sign_html)
    );
    $('#petition_info').show();
}

function change_area() {
    spinner.spin(target);
    reset();
    reload_map();
}

function reload_map() {
    units = "wpc";

    var area = $("input[name='area']:checked").val();

    var f = 'json/uk/' + area + '/topo_' + units + '.json';
    load_data(f, units);
}

$("input[name='area']").on('change', change_area);

$("#petition_dropdown").on('change', function() {
    spinner.spin(target);

    var petition_id = $("#petition_dropdown").val()

    load_petition(petition_id, false);
});

$("#constituency").on('change', function() {
    var ons_code = $("#constituency").val()

    var constituency_data = {
        "id": ons_code
    }

    select(constituency_data);
});

$('#hide_ui').click(function() {
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
});

d3.select('#petition_button').on('click', function() {
    petition_url = $('#petition_url').val()
    load_petition(petition_url, true);

    recolour_map();
});

