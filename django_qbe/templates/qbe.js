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
        function selectTab(tab) {
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
        $('#qbeForm').submit(function() {
            var mustSubmit = ($(".submitIfChecked :checked").length > 0);
            if (!mustSubmit) {
                alert("{% trans "You must check any field to show." %}");
            }
            return mustSubmit;
        });

        function updateRow() {
            var options = ['<option value="">----</option>'];
            for(i=0; i<qbe.CurrentModels.length; i++) {
                var appModel = qbe.CurrentModels[i];
                var key = appModel;
                var value = appModel.replace(".", ": ");
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

        $(".submit-row input[type='submit']").click(function() {
            var checked = ($("input[type='checkbox']:checked").length != 0);
            if (!checked) {
                alert("{% trans "Select at least one field to show" %}");
            }
            return checked;
        });

        $("#autocomplete").click(function() {
            var models = [];
            $(".qbeFillModels :selected").each(function() {
                var key = $(this).val();
                if (models.indexOf(key) == -1) {
                    models.push(key);
                }
            });
            $.ajax({
                url: "{% url django_qbe.views.qbe_autocomplete %}",
                dataType: 'json',
                data: "models="+ models.join(","),
                type: 'post',
                success: showAutocompletionOptions
            });
        });

        function showAutocompletionOptions(data) {
            if (!data) {
                return false;
            }
            var select = $("#autocompletionOptions");
            var options = ['<option disabled="disabled" value="">{% trans "With one of those sets" %}</option>'];
            for(i=0; i<data.length; i++) {
                var key = data[i].join("-");
                var value = data[i].join(", ");
                options.push('<option value="'+ key +'">'+ value +'</option>');
            }
            select.html(options.join(""));
            select.show();
            select.change(function() {
                addRelationsFrom(select.val());
            });
        }

        function addRelationsFrom(through) {
            var appModels = through.split("-");
            for(i=0; i<appModels.length; i++) {
                var appModel = appModels[i];
                var splits = appModel.split(".");
                qbe.Node.addModule(splits[0], splits[1]);
                $("#qbeForm .addlink").click();
                $(".qbeFillModels:last").val(appModel);
                $(".qbeFillModels:last").change();
            }
        }

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
                    // We can't jump fields with no target 'cause they are
                    // ManyToManyField and ForeignKey fields!
                    // if (!fields[key].target) {
                        var value = fields[key].label;
                        options.push('<option value="'+ key +'">'+ value +'</option>');
                    // }
                }
                $("#"+ domTo).html(options.join(""));
                // We need to raise change event
                $("#"+ domTo).change();
            }
        });

        $(".qbeFillFields").live("change", function() {
            var field = $(this).val();
            var splits = $(this).attr("id").split("-");
            var prefix = splits.splice(0, splits.length-1).join("-");
            var css = $(this).attr("class");
            var cssSplit = css.split("enable:")
            var inputs = cssSplit[cssSplit.length-1].split(",");
            for(i=0; i<inputs.length; i++) {
                var input = inputs[i];
                var domTo = prefix +"-"+ input;
                if (field) {
                    $("#"+ domTo).removeAttr("disabled");
                } else {
                    $("#"+ domTo).attr("disabled", "disabled");
                    $("#"+ domTo).val("");
                }
                if ($("#"+ domTo).is("input")) {
                    var appModel = $("#"+ prefix +"-model").val();
                    var fields = eval("qbe.Models."+ appModel).fields;
                    if (field in fields && fields[field].target) {
                        var target = fields[field].target;
                        if (target.through) {
                            addRelationsFrom(target.through);
                            // TODO: Make autofill for ManyToManyFields over its self.
                        } else {
                            $("#"+ domTo).val(target['name'] +"."+ target['model'] +"."+ target['field']);
                            $("#"+ domTo).prev().val("join")
                        }
                    } else {
                        $("#"+ domTo).val("");
                    }
                }
            }
        });
    });
})(jQuery.noConflict());
