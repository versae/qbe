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
    jsPlumb.ready(function() {
        var rows = "#qbeConditionsTable tbody tr";

        $('#qbeForm tbody tr').formset({
          prefix: '{{ formset.prefix }}',
          addText: 'Add another field',
          addCssClass: "add-row",
          deleteText: 'Remove',
          deleteCssClass: "inline-deletelink",
          formCssClass: "dynamic-{{ formset.prefix }}",
          emptyCssClass: "add-row",
          removed: qbe.Core.alternatingRows,
          added: qbe.Core.updateRow
        });
        // Workaround in order to get the class "add-row" in the right row
        $(rows + ":last").addClass("add-row");

        $("a.qbeModelAnchor").click(qbe.Core.toggleModel);

        $(".submit-row input[type='submit']").click(function() {

            $('tr.dynamic-form').each(function(){
                if (!$(this).find('.qbeFillModels').val() && !$(this).find('.qbeFillFields').val())
                    $(this).find('.inline-deletelink').click();
            });

            var checked = ($(".qbeContainer input[type='checkbox']:checked").length != 0);
            if (!checked) {
                alert("Select at least one field to show");
            } else {
                qbe.Diagram.saveBoxPositions();
            }
            return checked;
        });

        $('#qbeForm').delegate(".qbeFillModels", "change", qbe.Core.fillModelsEvent);
        $('#qbeForm').delegate(".qbeFillFields", "change", qbe.Core.fillFieldsEvent);

        function initialize() {
            if (qbe.Data) {
                qbe.Core.loadData(qbe.Data);
                qbe.Diagram.repaintAll();
            }
            $(window).resize();
        };
        initialize();
    });
})(jQuery);
