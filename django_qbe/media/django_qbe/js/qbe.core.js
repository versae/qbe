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
                qbe.Diagram.removeBox(appName, modelName)
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
            for(i=0; i<=relations.length; i++) {
                relation = relations[i];
                if (relation) {
                    sourceModelName = sourceModel.name;
                    sourceFieldName = relation.source;
                    label = qbe.Diagram.Defaults["foreign"].label;
                    labelStyle = qbe.Diagram.Defaults["foreign"].labelStyle;
                    paintStyle = qbe.Diagram.Defaults["foreign"].paintStyle;
                    makeOverlays = qbe.Diagram.Defaults["foreign"].makeOverlays;
                    backgroundPaintStyle = qbe.Diagram.Defaults["foreign"].backgroundPaintStyle;
                    if (relation.target.through) {
                        if (qbe.Models[relation.target.through.name][relation.target.through.model].is_auto) {
                            targetModel = relation.target;
                            label = relation.target.through.model;
                            labelStyle = qbe.Diagram.Defaults["many"].labelStyle;
                            paintStyle = qbe.Diagram.Defaults["many"].paintStyle;
                            makeOverlays = qbe.Diagram.Defaults["many"].makeOverlays;
                            backgroundPaintStyle = qbe.Diagram.Defaults["many"].backgroundPaintStyle;
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
                    console.log(hasConnection["qbeBox"]);
                    if (sourceModel && targetModel) {
                        && (!hasConnection["qbeBox"]
                            || (hasConnection["qbeBox"] && hasConnection["qbeBox"].length == 0))) {
                        divSource = document.getElementById(sourceId);
                        divTarget = document.getElementById(targetId);
                        if (divSource && divTarget) {
                            sourceField = $("#qbeBoxField_"+ sourceAppName +"\\."+ sourceModelName +"\\."+ sourceFieldName);
                            targetField = $("#qbeBoxField_"+ targetAppName +"\\."+ targetModelName +"\\."+ targetFieldName)
                            qbe.Diagram.addRelation(sourceId, sourceField, targetId, targetField, label, labelStyle, paintStyle, backgroundPaintStyle, makeOverlays());
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
