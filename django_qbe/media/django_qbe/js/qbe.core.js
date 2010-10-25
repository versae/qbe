if (!window.qbe) {
    var qbe = {};
}
qbe.CurrentModels = [];
qbe.Core = function() {};

(function($) {
    $(document).ready(function() {
        /**
         * Toggle visibility of models
         */
        qbe.Core.toggleModule = function (appName, modelName) {
            var model = qbe.Models[appName][modelName];
            var checked = document.getElementById('qbeModel_'+ modelName).checked;
            if (checked) {
                qbe.Core.addModule(appName, modelName);
            } else {
                qbe.Core.removeModule(appName, modelName);
            }
        }

        /**
         * Adds a qbe.Core to the layer
         */
        qbe.Core.addModule = function (appName, modelName) {
            var model = qbe.Models[appName][modelName];
            var inouts = qbe.Core.getInOuts(model);
            var appModel = appName +"."+ modelName;
            if (qbe.CurrentModels.indexOf(appModel) < 0) {
                qbe.Diagram.addBox(appName, modelName);
                qbe.CurrentModels.push(appModel);
                if (model.relations.length > 0) {
                    qbe.Core.updateRelations(appName, model);
                }
            }
        };

        /*
         * Removes a qbe Node from the layer
         */
        qbe.Core.removeModule = function(appName, modelName) {
            var appModel = appName +"."+ modelName;
            var pos = qbe.CurrentModels.indexOf(appModel);
            if (pos >= 0) {
                qbe.CurrentModels.splice(pos, 1);
                var model = qbe.Models[appName][modelName];
                delete model.index;
            }
        };

        /*
         * Update relations among models
         */
        qbe.Core.updateRelations = function (sourceAppName, sourceModel) {
            var label, labelStyle, paintStyle, backgroundPaintStyle, makeOverlay;
            var relations, relation, mediumHeight, hasConnection;
            var sourceModelName, sourceFieldName, sourceId, sourceField, divSource;
            var targetModel, targetAppName, targetModelName, targetFieldName, targetId, targetField, divTarget;
            relations = sourceModel.relations;
            jsPlumb.Defaults.DragOptions = { cursor: 'pointer', zIndex:2000 };
            for(i=0; i<=relations.length; i++) {
                relation = relations[i];
                if (relation) {
                    sourceModelName = sourceModel.name;
                    sourceFieldName = relation.source;
                    label = null;
                    labelStyle = null;
                    paintStyle = {
                        strokeStyle: '#96D25C',
                        lineWidth: 2
                    };
                    backgroundPaintStyle = {
                        lineWidth: 4,
                        strokeStyle: '#70A249'
                    };
                    makeOverlay = function() {
                        return [
                            new jsPlumb.Overlays.PlainArrow({
                                foldback: 0,
                                fillStyle: '#96D25C',
                                strokeStyle: '#70A249',
                                location: 0.99,
                                width: 10,
                                length: 10})
                        ];
                    };
                    if (relation.target.through) {
                        if (qbe.Models[relation.target.through.name][relation.target.through.model].is_auto) {
                            targetModel = relation.target;
                            label = relation.target.through.model;
                            labelStyle = {
                                fillStyle: "white",
                                padding: 0.25,
                                font: "12px sans-serif", 
                                color: "#C55454",
                                borderStyle: "#C55454", 
                                borderWidth: 3
                            };
                            paintStyle = {
                                strokeStyle: '#DB9292',
                                lineWidth: 2
                            };
                            backgroundPaintStyle = {
                                lineWidth: 4,
                                strokeStyle: '#C55454'
                            };
                            makeOverlay = function() {
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
                            };
                        } else {
                            targetModel = relation.target.through;
                        }
                    } else {
                        targetModel = relation.target;
                    }
                    targetAppName = targetModel.name;
                    targetModelName = targetModel.model;
                    targetFieldName = targetModel.field;
                    sourceId = "qbeBox_"+ sourceModelName;
                    targetId = "qbeBox_"+ targetModelName;
                    hasConnection = jsPlumb.getConnections({scope: "qbeBox", source: sourceId, target: targetId});
                    if (sourceModel && targetModel
                        && (!hasConnection["qbeBox"]
                            || (hasConnection["qbeBox"] && hasConnection["qbeBox"].length == 0))) {
                        divSource = document.getElementById(sourceId);
                        divTarget = document.getElementById(targetId);
                        if (divSource && divTarget) {
                            sourceField = $("#qbeBoxField_"+ sourceAppName +"\\."+ sourceModelName +"\\."+ sourceFieldName);
                            targetField = $("#qbeBoxField_"+ targetAppName +"\\."+ targetModelName +"\\."+ targetFieldName);
                            mediumHeight = sourceField.css("height");
                            mediumHeight = parseInt(mediumHeight.substr(0, mediumHeight.length - 2)) / 2;
                            jsPlumb.Defaults.Container = "qbeDiagramContainer";
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
                                overlays: makeOverlay(),
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
                    }
                }
            }
        }

        /**
         * Return in & outs according to relations among models
         */
        qbe.Core.getInOuts = function(model) {
            var inputs = [];
            var outputs = [];
            var fields = model.fields || {};
            for(key in fields) {
                if (fields[key].target) {
                    outputs.push(fields[key].label);
                    fields[key].index = outputs.length;
                } else {
                    inputs.push(fields[key].label);
                    fields[key].index = inputs.length;
                }
            }
            return [inputs, outputs];
        }

    });
})(jQuery.noConflict());
