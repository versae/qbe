if (!window.qbe) {
    var qbe = {};
}
qbe.CurrentModels = [];
qbe.CurrentRelations = [];
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
            var appModel, model, target1, target2;
            $("#qbeModel_"+ modelName).attr("checked", "checked");
            model = qbe.Models[appName][modelName];
            appModel = appName +"."+ modelName;
            if (qbe.CurrentModels.indexOf(appModel) < 0) {
                qbe.CurrentModels.push(appModel);
                if (model.is_auto) {
                    target1 = model.relations[0].target;
                    target2 = model.relations[1].target;
                    qbe.Core.addModule(target1.name, target1.model);
                    qbe.Core.addModule(target2.name, target2.model);
                } else {
                    qbe.Diagram.addBox(appName, modelName);
                }
                qbe.Core.updateRelations();
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
                qbe.Diagram.removeRelations(appName, modelName);
            }
        };

        /*
         * Update relations among models
         */
        qbe.Core.updateRelations = function () {
            var label, labelStyle, paintStyle, backgroundPaintStyle, makeOverlay;
            var relations, relation, mediumHeight, connections;
            var sourceAppModel, sourceModelName, sourceAppName, sourceModel, sourceFieldName, sourceId, sourceField, sourceSplits, divSource;
            var targetModel, targetAppName, targetModelName, targetFieldName, targetId, targetField, divTarget;
            for(var i=0; i<qbe.CurrentModels.length; i++) {
                sourceAppModel = qbe.CurrentModels[i];
                sourceSplits = sourceAppModel.split(".");
                sourceAppName = sourceSplits[0];
                sourceModelName = sourceSplits[1];
                sourceModel = qbe.Models[sourceAppName][sourceModelName];
                relations = sourceModel.relations;
                for(var j=0; j<relations.length; j++) {
                    relation = relations[j];
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
                    sourceField = $("#qbeBoxField_"+ sourceAppName +"\\."+ sourceModelName +"\\."+ sourceFieldName);
                    targetField = $("#qbeBoxField_"+ targetAppName +"\\."+ targetModelName +"\\."+ targetFieldName);
                    if (sourceModel && targetModel
                        && !qbe.Diagram.hasConnection(sourceField, targetField)) {
                        sourceId = "qbeBox_"+ sourceModelName;
                        targetId = "qbeBox_"+ targetModelName;
                        divSource = document.getElementById(sourceId);
                        divTarget = document.getElementById(targetId);
                        if (divSource && divTarget) {
                            qbe.Diagram.addRelation(sourceId, sourceField, targetId, targetField, label, labelStyle, paintStyle, backgroundPaintStyle, makeOverlays());
                        }
                    }
                }
            }
        }

    });
})(jQuery.noConflict());
