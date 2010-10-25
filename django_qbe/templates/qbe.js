{% load i18n %}
/**
 * QBE Interface details
 */
if (!window.qbe) {
    var qbe = {};
}
qbe.Models = {% autoescape off %}{{ json_models }}{% endautoescape %};
{% if json_data %}
qbe.Data = {% autoescape off %}{{ json_data }}{% endautoescape %};
{% else %}
qbe.Data = null;
{% endif %}
qbe.Containers = [];
(function($) {
    $(document).ready(function() {
        $("#qbeTabularTab").click(function() {
            selectTab("Tabular");
            return false;
        });
        $("#qbeDiagramTab").click(function() {
            selectTab("Diagram");
            $(window).resize();
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
//        $('#qbeForm').submit(function() {
//            var mustSubmit = ($(".submitIfChecked:checked").length > 0);
//            if (!mustSubmit) {
//                alert("{% trans "You must check any field to show." %}");
//            }
//            return mustSubmit;
//        });

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
            } else {
                qbe.Diagram.saveBoxPositions();
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
                qbe.Core.addModule(splits[0], splits[1]);
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

        function loadData(data) {
            var initialForms, maxForms, totalForms;
            initialForms = parseInt(data["form-INITIAL_FORMS"][0]);
            maxForms = parseInt(data["form-MAX_NUM_FORMS"][0]);
            totalForms = parseInt(data["form-TOTAL_FORMS"][0]);
            for(var i=initialForms; i<totalForms; i++) {
                var appModel, splits, show, model, field, sorted;
                appModel = data["form-"+ i +"-model"][0];
                if (!(appModel in qbe.CurrentModels)) {
                    splits = appModel.split(".");
                    app = splits[0];
                    model = splits[1];
                    qbe.Core.addModule(app, model);
                    $("#qbeModel_"+ model).attr("checked", "checked");
                }
                updateModels();
                $("#id_form-"+ i +"-model").val(appModel);
                $("#id_form-"+ i +"-model").change();
                field = data["form-"+ i +"-field"][0];
                $("#id_form-"+ i +"-field").val(field);
                $("#id_form-"+ i +"-field").change();
                sorted = data["form-"+ i +"-sort"][0];
                $("#id_form-"+ i +"-sort").val(sorted);
                show = data["form-"+ i +"-show"][0];
                if (show && show == "on") {
                    $("#id_form-"+ i +"-show").attr("checked", "checked");
                } else {
                    $("#id_form-"+ i +"-show").remove("checked");
                }
                c = 0;
                criteria = data["form-"+ i +"-criteria_"+ c];
                while(criteria) {
                    $("#id_form-"+ i +"-criteria_"+ c).val(criteria[0]);
                    criteria = data["form-"+ i +"-criteria_"+ ++c];
                }
            }
            $("#id_form_limit").val(data["limit"][0]);
            var positions, position_splits, splits, modelName;
            positions = data["positions"][0].split("|");
            for(var i=0; i<positions.length; i++) {
                splits = positions[i].split("@");
                modelName = splits[0];
                position_splits = splits[1].split(":");
                $("#qbeBox_"+ modelName).css({
                    left: position_splits[0],
                    top: position_splits[1]
                });
            }
            $("#id_positions").val(data["positions"][0]);
        };

        function initialize() {
            if (qbe.Data) {
                loadData(qbe.Data);
            }
            $(window).resize();
        };
        initialize();
    });
})(jQuery.noConflict());
