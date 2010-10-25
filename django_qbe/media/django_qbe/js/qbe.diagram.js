qbe.Diagram = {};

(function($) {
    $(document).ready(function() {
        var divBoxAnchor = $("#qbeBoxAnchor");
        jsPlumb.Defaults.Container = "qbeDiagramContainer";

        qbe.Diagram.addBox = function (appName, modelName) {
            var model, root, divBox, divTitle, fieldName, field, divField, divFields, divManies, primaries, countFields;
            primaries = [];
            model = qbe.Models[appName][modelName];
            root = $("#qbeDiagramContainer");
            divBox = $("<DIV>");
            divBox.attr("id", "qbeBox_"+ modelName);
            divBox.css({
                "left": (Math.random() * 150 + 1)+ "px",
                "top": (Math.random() * 250 + 1)+ "px"
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
                divFields.mouseover(function() {
                    $(this).removeClass("fieldsContainer");
                });
                divFields.mouseout(function() {
                    $(this).addClass("fieldsContainer");
                });
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
                handle: ".title"
            });

//            divBoxAnchor.plumb({
//                scope: "qbeDraging",
//                target: "qbeBox_"+ modelName,
//                endpoints: [
//                    new jsPlumb.Endpoints.Dot({radius: 0}),
//                    new jsPlumb.Endpoints.Dot({radius: 0})
//                ],
//                paintStyle: {
//                    strokeStyle: '#fff',
//                    lineWidth: 0
//                }
//            });
//            $("canvas:last").css({"display": "none"});
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
        }

    });
})(jQuery.noConflict());
