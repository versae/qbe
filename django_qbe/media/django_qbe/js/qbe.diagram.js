qbe.Diagram = {};

(function($) {
    $(document).ready(function() {
        jsPlumb.Defaults.Container = "qbeDiagramContainer";

        qbe.Diagram.addBox = function (appName, modelName) {
            var model, root, divBox, divTitle, fieldName, field, divField, divFields, divManies, primaries, countFields;
            primaries = [];
            model = qbe.Models[appName][modelName];
            root = $("#qbeDiagramContainer");
            divBox = $("<DIV>");
            divBox.attr("id", "qbeBox_"+ modelName);
            divBox.css({
                "left": (parseInt(Math.random() * 15 + 1) * 10) + "px",
                "top": (parseInt(Math.random() * 25 + 1) * 10) + "px",
            });
            divBox.attr();
            divBox.addClass("body");
            divTitle = $("<DIV>");
            divTitle.addClass("title");
            divTitle.html(modelName);
            divFields = $("<DIV>");
            countFields = 0;
            for(fieldName in model.fields) {
                field = model.fields[fieldName];
                divField = $("<DIV>");
                divField.addClass("field");
                divField.html(field.label);
                divField.attr("id", "qbeBoxField_"+ appName +"."+ modelName +"."+ fieldName);
                if (field.type == "ForeignKey") {
                    divField.addClass("foreign");
                    divField.click(qbe.Diagram.addRelated);
                    divBox.prepend(divField);
                } else if (field.type == "ManyToManyField") {
                    divField.addClass("many");
                    divField.click(qbe.Diagram.addRelated);
                    if (!divManies) {
                        divManies = $("<DIV>");
                    }
                    divManies.append(divField);
                } else if (field.primary) {
                    divField.addClass("primary");
                    primaries.push(divField);
                } else {
                    divFields.append(divField);
                    countFields++;
                }
            }
            if (countFields < 5 && countFields > 0) {
                divFields.addClass("noOverflow");
            } else if (countFields > 0) {
                divFields.addClass("fieldsContainer");
                /*
                divFields.mouseover(function() {
                    $(this).removeClass("fieldsContainer");
                });
                divFields.mouseout(function() {
                    $(this).addClass("fieldsContainer");
                });
                */
            }
            if (divManies) {
                divBox.append(divManies);
            }
            divBox.append(divFields);
            for(divField in primaries) {
                divBox.prepend(primaries[divField]);
            }
            divBox.prepend(divTitle);
            root.append(divBox);
            divBox.draggable({
                handle: ".title",
                grid: [10, 10],
                stop: function (event, ui) {
                    // Avoid drag boxes out of the container
                    /*
                    var $this, position, left, top;
                    $this = $(this);
                    position = $this.position()
                    if (position.left <= 170) {
                        $this.css("left", "10px")
                    }
                    if (position.top <= 0) {
                        $this.css("top", "10px")
                    }
                    */
                }
            });
        };

        qbe.Diagram.addRelated = function (obj) {
            var splits, appName, modelName, fieldName, field, target;
            splits = this.id.split("qbeBoxField_")[1].split(".");
            appName = splits[0];
            modelName = splits[1];
            fieldName = splits[2];
            field = qbe.Models[appName][modelName].fields[fieldName];
            target = field.target;
            qbe.Core.addModule(target.name, target.model);
            $("#qbeModel_"+ target.model).attr("checked", "checked");
            if (target.through && (!qbe.Models[target.through.name][target.through.model].is_auto)) {
                qbe.Core.addModule(target.through.name, target.through.model);
                $("#qbeModel_"+ target.through.model).attr("checked", "checked");
            }
            $(".qbeCheckModels").change();
            qbe.Core.updateRelations(appName, qbe.Models[appName][modelName]);
        };

        qbe.Diagram.saveBoxPositions = function () {
            var positions, position, left, top, splits, appModel, modelName;
            positions = [];
            for(var i=0; i<qbe.CurrentModels.length; i++) {
                appModel = qbe.CurrentModels[i];
                splits = appModel.split(".");
                modelName = splits[1];
                position = $("#qbeBox_"+ modelName).position();
                positions.push(modelName +"@"+ position.left +";"+ position.top);
            }
            $("#id_form_positions").val(positions.join("|"));
        };

    });

    $(window).resize(function () {
        $("#qbeDiagramContainer").height($(window).height() - 210);
    });

})(jQuery.noConflict());
