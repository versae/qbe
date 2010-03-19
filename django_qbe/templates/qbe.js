{% load i18n %}
/**
 * QBE Interface details
 */
if (!window.qbe) {
    var qbe = {};
}
qbe.Models = {% autoescape off %}{{ json_models }}{% endautoescape %};
qbe.Containers = [];
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
            for(i=0; i<qbe.Node.Layer.containers.length; i++) {
                var container = qbe.Node.Layer.containers[i];
                var config = container.config;
                var key = config.application +"."+ config.title;
                var value = config.application +": "+ config.title;
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
                var fields = eval("qbe.Models."+ appModel).fields;
                var splits = $(this).attr("id").split("-");
                var prefix = splits.splice(0, splits.length-1).join("-");
                var css = $(this).attr("class");
                var cssSplit = css.split("to:")
                var domTo = prefix +"-"+ cssSplit[cssSplit.length-1];
                var options = ['<option value="">*</option>'];
                for(key in fields) {
                    if (!fields[key].target) {
                        var value = fields[key].label;
                        options.push('<option value="'+ key +'">'+ value +'</option>');
                    }
                }
                $("#"+ domTo).html(options.join(""));
                // We need to raise change event
                $("#"+ domTo).change();
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
                    $("#"+ domTo).removeAttr("disabled");
                } else {
                    $("#"+ domTo).attr("disabled", "disabled");
                    $("#"+ domTo).val("");
                }
            }
        });
    });
})(jQuery.noConflict());
