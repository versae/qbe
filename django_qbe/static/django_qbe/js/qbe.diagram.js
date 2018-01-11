qbe.Diagram = {};

(function($) {
    jsPlumb.ready(function() {
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
                    ["Arrow", {
                        foldback: 0,
                        fillStyle: '#96D25C',
                        strokeStyle: '#70A249',
                        location: 0.99,
                        width: 10,
                        length: 10}]
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
        };

        jsPlumb.Defaults.DragOptions = {cursor: 'pointer', zIndex: 2000};
        jsPlumb.Defaults.Container = "qbeDiagramContainer";

        var get_position = function() {

            function intersectRect(r1, r2) {
              return !(r2.left > r1.right ||
                       r2.right < r1.left ||
                       r2.top > r1.bottom ||
                       r2.bottom < r1.top);
            }
            function make_rect(top_top, top_left, bot_top, bot_left){
                return {
                    'top': top_top,
                    'left': top_left,
                    'right': bot_left,
                    'bottom': bot_top,
                };
            }

            var found_pos, pos, left, top = 0;
            var boxes = [];
            // Make sure that a new box does not overlap and existing box
            $('#qbeDiagramContainer > div').each(function(){
                pos = $(this).position();
                boxes.push([pos.top, pos.left, pos.top + $(this).height(), pos.left + $(this).width()]);
            });

            var max_width = $('#qbeDiagramContainer').innerWidth() - 180;
            var max_height = $('#qbeDiagramContainer').innerHeight() - 200;

            var tries = 0;
            do{
                top = parseInt(Math.random() * max_height);
                left = parseInt(Math.random() * max_width);

                found_pos = true;
                for (var i in boxes){
                    if (intersectRect(
                        make_rect(top, left, top + 170, left + 190),
                        make_rect(boxes[i][0], boxes[i][1], boxes[i][2], boxes[i][3])
                    )) {
                        found_pos = false;
                        break;
                    }
                }
                tries++;
                if (tries > 50)
                    break;
            }while(!found_pos);

            return {'left': left, 'top': top};
        };

        /**
         * Adds a new model box with its fields
         */
        qbe.Diagram.addBox = function (appName, modelName) {
            var model, root, divBox, divTitle, fieldName, field, divField, divFields, divManies, primaries, countFields, anchorDelete;
            primaries = [];
            model = qbe.Models[appName][modelName];
            root = $("#qbeDiagramContainer");
            divBox = $("<DIV>");
            divBox.attr("id", "qbeBox_"+ modelName);
            divBox.css(get_position());
            divBox.addClass("body");
            divTitle = $("<DIV>");
            divTitle.addClass("title");
            qbe.Diagram.setLabel(divTitle, qbe.Core.getVerboseName(appName, modelName), false);
            anchorDelete = $("<A>");
            anchorDelete.html("x");
            anchorDelete.attr("href", "javascript:void(0);");
            anchorDelete.addClass("inline-deletelink");
            anchorDelete.click(function () {
                $("#qbeModelAnchor_"+ appName +"\\\."+ modelName).click();
            });
            divTitle.append(anchorDelete);
            divFields = $("<DIV>");
            countFields = 0;
            for(fieldName in model.fields) {
                field = model.fields[fieldName];
                divField = $("<DIV>");
                divField.addClass("field");
                qbe.Diagram.setLabel(divField, field.label, field.primary);
                divField.attr("id", "qbeBoxField_"+ appName +"."+ modelName +"."+ fieldName);
                if (field.type == "ForeignKey" || field.type == "OneToOneField") {
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
                // Uncomment to change the size of the div containing the regular
                // fields no mouse over/out
                divFields.mouseover(function() {
                    $(this).removeClass("fieldsContainer");
                });
                divFields.mouseout(function() {
                    $(this).addClass("fieldsContainer");
                });
                jsPlumb.repaint(["qbeBox_"+ modelName]);
                */
            }
            if (divManies) {
                divBox.append(divManies);
            }
            divBox.append(divFields);
            for(divField in primaries) {
                if ('html' in primaries[divField])
                    divBox.prepend(primaries[divField]);
            }
            divBox.prepend(divTitle);
            root.append(divBox);
            this.repaintAll();
            var that = this;
            divBox.draggable({
                handle: ".title",
                grid: [10, 10],
                drag: function(event, ui) {
                    jsPlumb.repaintEverything();
                },
                stop: function (event, ui) {
                    var $this, position, left, top;
                    that.repaintAll();
                    $this = $(this);
                    position = $this.position();
                    left = position.left;
                    if (position.left < 0) {
                        left = "0px";
                    }
                    if (position.top < 0) {
                        top = "0px";
                    }
                    $this.animate({left: left, top: top}, "fast", function() {
                        jsPlumb.repaint(["qbeBox_"+ modelName]);
                    });
                }
            });
        };

        /**
         * Set the label fo the fields getting shorter and adding ellipsis
         */
        qbe.Diagram.setLabel = function (div, label, primary) {
            div.html(label);
            if (label.length > 18) {
                if (primary) {
                    div.html(label.substr(0, 18) +"…");
                } else if (label.length > 21) {
                    div.html(label.substr(0, 21) +"…");
                }
                div.attr("title", label);
                div.attr("alt", label);
            }
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
                    ["Blank", {}],
                    ["Blank", {}],
                ],
                paintStyle: paintStyle,
                backgroundPaintStyle: backgroundPaintStyle,
                overlays: overlays,
                anchors: [
                    [1, 0, 1, 0, 0, sourceField.position().top + mediumHeight + 4],
                    [0, 0, -1, 0, 0, targetField.position().top + mediumHeight + 4],
                    [0, 0, -1, 0, 0, sourceField.position().top + mediumHeight + 4],
                    [1, 0, 1, 0, 0, targetField.position().top + mediumHeight + 4]
                ]
            });
            qbe.CurrentRelations.push(sourceField.attr("id") +"~"+ targetField.attr("id"));
        }

        /**
         * Add related many to many models through clicking in the field name
         */
        qbe.Diagram.addRelated = function (obj) {
            var splits, appName, modelName, fieldName, field, target;
            splits = this.id.split("qbeBoxField_")[1].split(".");
            appName = splits[0];
            modelName = splits[1];
            fieldName = splits[2];
            field = qbe.Models[appName][modelName].fields[fieldName];
            target = field.target;
            qbe.Core.addModule(target.name, target.model);
            $("#qbeModelAnchor_"+ target.name +"\\\."+ target.model).click();
            if (target.through && (!qbe.Models[target.through.name][target.through.model].is_auto)) {
                qbe.Core.addModule(target.through.name, target.through.model);
                $("#qbeModelAnchor_"+ target.through.name +"\\\."+ target.through.model).click();
            }
            $(".qbeCheckModels").change();
        };

        /**
         * Returns a boolean value according to the relation between sourceId
         * and targetId does exist or not
         */
        qbe.Diagram.hasConnection = function (sourceField, targetField) {
            return (sourceField && targetField
                    && $.inArray(sourceField.attr("id") +"~"+ targetField.attr("id"),qbe.CurrentRelations) >= 0);
        };

        /**
         * Remove the box and all connections related to it
         */
        qbe.Diagram.removeBox = function (appName, modelName) {
            jsPlumb.anchorManager.clearFor("qbeBox_"+ modelName);
            $("#qbeBox_"+ modelName).remove();
        };

        /**
         * Remove all connections for the box identified by appName and modelName
         */
        qbe.Diagram.removeRelations = function (appName, modelName) {
            var currentRelations, relation, relationsSplits, relationsLength, sourceSplits, sourceId, targetSplits, targetId;
            currentRelations = [];
            relationsLength = qbe.CurrentRelations.length;
            for(var i=0; i<relationsLength; i++) {
                relation = qbe.CurrentRelations[i];
                if (relation.indexOf(appName +"."+ modelName) < 0) {
                    currentRelations.push(relation);
                } else {
                    relationsSplit = relation.split("~");
                    source = relationsSplit[0];
                    sourceSplits = source.split("qbeBoxField_")[1].split(".");
                    sourceId = "qbeBox_"+ sourceSplits[1];
                    target = relationsSplit[1];
                    targetSplits = target.split("qbeBoxField_")[1].split(".");
                    targetId = "qbeBox_"+ targetSplits[1];
                    jsPlumb.detach(sourceId, targetId);
                }
            }
            qbe.CurrentRelations = currentRelations;
        };

        /**
         * Save the positions of the all the boxes in a serialized way into a
         * input type hidden
         */
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
            $("#id_form_positions").val(positions.join("|"));
        };

        /**
         * Repaint the models and relations among them
         */
        qbe.Diagram.repaintAll = function () {
            var appModel, splits;
            for(var i=0; i<qbe.CurrentModels.length; i++) {
                appModel = qbe.CurrentModels[i];
                splits = appModel.split(".");
                qbe.Diagram.removeRelations(splits[0], splits[1]);
            }
            jsPlumb.deleteEveryEndpoint();
            qbe.Core.updateRelations();
            jsPlumb.repaintEverything();
        };

    });

})($);
