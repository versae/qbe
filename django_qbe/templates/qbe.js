{% load i18n %}
/**
 * QBE Interface details
 */

var qbeContainers = [];
var qbeModels = {% autoescape off %}{{ json_models }}{% endautoescape %};
var qbe$ = jQuery.noConflict();
(function($) {
$(document).ready(function() {
    $("#qbeTabularTab").click(function() {
        selectTab("Tabular");
        return false;
    });
    $("#qbeDiagramTab").click(function() {
        selectTab("Diagram");
        return false;
    });
    $("#qbeDataTab").click(function() {
        selectTab("Data");
        return false;
    });
    $("#qbeQueryTab").click(function() {
        selectTab("Query");
        return false;
    });
    $("#qbeModelsTab").click(function() {
        $("#qbeConnectorList").toggle();
    });
    selectTab = function(tab) {
        $("#qbeTabular").hide();
        $("#qbeDiagram").hide();
        $("#qbeData").hide();
        $("#qbeQuery").hide();
        $("#qbe"+ tab).show();
    }

    $('#qbeForm tbody tr').formset({
      prefix: '{{ formset.prefix }}',
      addText: '{% trans "Add another" %}',
      addCssClass: "addlink",
      deleteText: '',
      deleteCssClass: "deletelink",
      added: updateRow
    });

    function updateRow() {
        var options = ['<option value="">----</option>'];
        for(i=0; i<qbeNode.qbeNodeLayer.containers.length; i++) {
            var container = qbeNode.qbeNodeLayer.containers[i];
            var key = container.config.application +"."+ container.config.title;
            var value = container.config.application +": "+ container.config.title;
            options.push('<option value="'+ key +'">'+ value +'</option>');
        }
        $(".qbeFillModels").each(function() {
            var val = $(this).val();
            $(this).html(options.join(""));
            $(this).val(val);
        });
    }

    function updateModels() {
        $(this).each(updateRow);
    }

    $(".qbeCheckModels").change(updateModels);
    $(".qbeCheckModels").each(function() {
        $(this).attr("checked", false);
    });

    $(".qbeFillModels").live("change", function() {
        var appModel = $(this).val();
        if (appModel) {
            var fields = eval("qbeModels."+ appModel).fields;
            var splits = $(this).attr("id").split("-");
            var prefix = splits.splice(0, splits.length-1).join("-");
            var css = $(this).attr("class");
            var cssSplit = css.split("to:")
            var domTo = prefix +"-"+ cssSplit[cssSplit.length-1];
            var options = ['<option value="">----</option>'];
            for(key in fields) {
                if (!fields[key].target) {
                    var value = fields[key].label;
                    options.push('<option value="'+ key +'">'+ value +'</option>');
                }
            }
            $("#"+ domTo).html(options.join(""));
        }
    });

    $(".qbeFillFields").live("change", function() {
        var enable = $(this).val();
        var splits = $(this).attr("id").split("-");
        var prefix = splits.splice(0, splits.length-1).join("-");
        var css = $(this).attr("class");
        var cssSplit = css.split("enable:")
        var inputs = cssSplit[cssSplit.length-1].split(",");
        for(i=0; i<inputs.length; i++) {
            var input = inputs[i];
            var domTo = prefix +"-"+ input;
            if (enable) {
                $(domTo).removeAttr("disabled");
            } else {
                $(domTo).attr("disabled", "disabled");
            }
        }
    });
});
})(qbe$);
