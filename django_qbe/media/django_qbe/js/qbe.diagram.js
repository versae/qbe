qbe.Diagram = {};

(function($) {
    $(document).ready(function() {
        /**
         * Default options for Diagram and jsPlumb
         */
        qbe.Diagram.Defaults = {};
        qbe.Diagram.Defaults["foreign"] = {
            label: null,
            labelStyle: null,
            paintStyle: {
                strokeStyle: '#96D25C',
                lineWidth: 2
            },
            backgroundPaintStyle: {
                lineWidth: 4,
                strokeStyle: '#70A249'
            },
            makeOverlays: function() {
                return [
                    new jsPlumb.Overlays.PlainArrow({
                        foldback: 0,
                        fillStyle: '#96D25C',
                        strokeStyle: '#70A249',
                        location: 0.99,
                        width: 10,
                        length: 10})
                ];
            }
        };
        qbe.Diagram.Defaults["many"] = {
            label: null,
            labelStyle: {
                fillStyle: "white",
                padding: 0.25,
                font: "12px sans-serif", 
                color: "#C55454",
                borderStyle: "#C55454", 
                borderWidth: 3
            },
            paintStyle: {
                strokeStyle: '#DB9292',
                lineWidth: 2
            },
            backgroundPaintStyle: {
                lineWidth: 4,
                strokeStyle: '#C55454'
            },
            makeOverlays: function() {
                return [
                    new jsPlumb.Overlays.PlainArrow({
                        foldback: 0,
                        fillStyle: '#DB9292',
                        strokeStyle: '#C55454',
                        location: 0.75,
                        width: 10,
                        length: 10}),
                    new jsPlumb.Overlays.PlainArrow({
                        foldback: 0,
                        fillStyle: '#DB9292',
                        strokeStyle: '#C55454',
                        location: 0.25,
                        width: 10,
                        length: 10})
                ];
            }
        }

        jsPlumb.Defaults.DragOptions = { cursor: 'pointer', zIndex:2000 };
        jsPlumb.Defaults.Container = "qbeDiagramContainer";

        /**
         * Adds a new model box with its fields
         */
        qbe.Diagram.addBox = function (appName, modelName) {
            var model, root, divBox, divTitle, fieldName, field, divField, divFields, divManies, primaries, countFields;
            primaries = [];
            model = qbe.Models[appName][modelName];
            root = $("#qbeDiagramContainer");
            divBox = $("<DIV>");
            divBox.attr("id", "qbeBox_"+ modelName);
            divBox.css({
                "left": (parseInt(Math.random() * 15 + 1) * 10) + "px",
                "top": (parseInt(Math.random() * 25 + 1) * 10) + "px"
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
                    var $this, position, left, top;
                    $this = $(this);
                    position = $this.position()
                    left = position.left;
                    if (position.left <= 170) {
                        left = "0px";
                    }
                    if (position.top <= 0) {
                        top = "0px";
                    }
                    $this.animate({left: left, top: top});
                }
            });
        };


        /**
         * Create a relation between a element with id sourceId and targetId
         * - sourceId.
         * - sourceFieldName
         * - targetId.
         * - targetFieldName
         * - label.
         * - labelStyle.
         * - paintStyle.
         * - backgroundPaintStyle.
         * - overlays.
         */
        qbe.Diagram.addRelation = function(sourceId, sourceField, targetId, targetField, label, labelStyle, paintStyle, backgroundPaintStyle, overlays) {
            var mediumHeight;
            mediumHeight = sourceField.css("height");
            mediumHeight = parseInt(mediumHeight.substr(0, mediumHeight.length - 2)) / 2;
            jsPlumb.connect({
                scope: "qbeBox",
                label: label,
                labelStyle: labelStyle,
                source: sourceId,
                target: targetId,
                endpoints: [
                    new jsPlumb.Endpoints.Dot({radius: 0}),
                    new jsPlumb.Endpoints.Dot({radius: 0})
                ],
                paintStyle: paintStyle,
                backgroundPaintStyle: backgroundPaintStyle,
                overlays: overlays,
                anchors: [
                    jsPlumb.makeDynamicAnchor([
                        jsPlumb.makeAnchor(1, 0, 1, 0, 0, sourceField.position().top + mediumHeight + 4),
                        jsPlumb.makeAnchor(0, 0, -1, 0, 0, sourceField.position().top + mediumHeight + 4)
                    ]),
                    jsPlumb.makeDynamicAnchor([
                        jsPlumb.makeAnchor(0, 0, -1, 0, 0, targetField.position().top + mediumHeight + 4),
                        jsPlumb.makeAnchor(1, 0, 1, 0, 0, targetField.position().top + mediumHeight + 4)
                    ])
                ]
            });
        }

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
            var positions, left, top, splits, appModel, modelName;
            positions = [];
            for(var i=0; i<qbe.CurrentModels.length; i++) {
                appModel = qbe.CurrentModels[i];
                splits = appModel.split(".");
                modelName = splits[1];
                left = $("#qbeBox_"+ modelName).css("left");
                top = $("#qbeBox_"+ modelName).css("top");
                positions.push(appModel +"@"+ left +";"+ top);
            }
            alert(positions.join("|"))
            $("#id_form_positions").val(positions.join("|"));
        };

    });

    $(window).resize(function () {
        $("#qbeDiagramContainer").height($(window).height() - 210);
    });

})(jQuery.noConflict());
