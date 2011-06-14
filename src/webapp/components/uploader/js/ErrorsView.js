/*
Copyright 2011 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global window, fluid_1_4:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_4 = fluid_1_4 || {};

(function ($, fluid) {

    fluid.uploader = fluid.uploader || {};
    
    fluid.defaults("fluid.uploader.errorsView", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "fluid.uploader.errorsView.preInit",
        finalInitFunction: "fluid.uploader.errorsView.finalInit",
        
        components: {
            // TODO: This won't scale nicely with more types of errors. 
            fileSizeErrorSection: {
                type: "fluid.uploader.errorsView.section",
                container: "{errorsView}.dom.fileSizeErrorSection",
                options: {
                    model: {
                        errorCode: fluid.uploader.queueErrorConstants.FILE_EXCEEDS_SIZE_LIMIT
                    },
                    
                    strings: {
                        header: "{errorsView}.options.strings.exceedsFileSize"
                    }
                }
            },
            
            numFilesErrorSection: {
                type: "fluid.uploader.errorsView.section",
                container: "{errorsView}.dom.numFilesErrorSection",
                options: {
                    model: {
                        errorCode: fluid.uploader.queueErrorConstants.QUEUE_LIMIT_EXCEEDED
                    },
                    
                    strings: {
                        header: "{errorsView}.options.strings.exceedsNumFilesLimit"
                    }
                }
            }
        },
        
        selectors: {
            header: ".flc-uploader-erroredHeader",
            numFilesErrorSection: ".flc-uploader-exceededFileLimit-template",
            fileSizeErrorSection: ".flc-uploader-exceededUploadLimit-template"
        },
        
        strings: {
            headerText: "Warning(s)",
            exceedsNumFilesLimit: "Too many files were selected. %numFiles were not added to the queue.",
            exceedsFileSize: "%numFiles files were too large and were not added to the queue."
        }
    });

    fluid.uploader.errorsView.preInit = function (that) {
        that.refreshView = function () {
            var hasErrors = false;
            fluid.each(that.sections, function (section) {
                hasErrors = (section.model.files.length > 0);
            });
            
            if (hasErrors) {
                that.container.show();
            } else {
                that.container.hide();
            }
        };
    };
    
    fluid.uploader.errorsView.finalInit = function (that) {
        that.sections = [that.fileSizeErrorSection, that.numFilesErrorSection];
        that.locate("header").text(that.options.strings.headerText);
        that.container.hide();
    };

    fluid.demands("fluid.uploader.errorsView", "fluid.uploader.multiFileUploader", {
        container: "{multiFileUploader}.options.selectors.errors", // TODO: Why can't I bind to {multiFileUploader}.dom.errors?
        options: {            
            listeners: {
                "{multiFileUploader}.events.afterFileDialog": "{errorsView}.refreshView",
                "{multiFileUploader}.events.onUploadStart": "{errorsView}.clearAllErrors"
            }
        }
    });
    
    fluid.defaults("fluid.uploader.errorsView.section", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "fluid.uploader.errorsView.section.preInit",
        finalInitFunction: "fluid.uploader.errorsView.section.finalInit",
        
        model: {
            errorCode: undefined,
            files: [],
            showingDetails: false
        },
        
        events: {
            afterErrorsCleared: null
        },
        
        selectors: {
            deleteErrorButton: ".flc-uploader-erroredButton",
            showHideFilesToggle: ".flc-uploader-errored-bodyButton",
            errorDetails: ".flc-uploader-erroredBody-togglable",
            errorTitle: ".flc-uploader-erroredTitle",
            erroredFiles: ".flc-uploader-erroredFiles"
        },
        
        strings: {
            hideFiles: "Hide files",
            showFiles: "Show files",
            fileListDelimiter: ", "
        }
    });
    
    fluid.uploader.errorsView.section.preInit = function (that) {
        that.toggleDetails = function () {
            var detailsAction = that.model.showingDetails ? that.hideDetails : that.showDetails;
            detailsAction();
        };
        
        that.showDetails = function () {
            that.locate("errorDetails").show();
            that.locate("showHideFilesToggle").text(that.options.strings.hideFiles);
            that.model.showingDetails = true;
        };
        
        that.hideDetails = function () {
            that.locate("errorDetails").hide();
            that.locate("showHideFilesToggle").text(that.options.strings.showFiles);
            that.model.showingDetails = false;
        };
        
        that.addFile = function (file, errorCode) {
            if (errorCode === that.model.errorCode) {
                that.model.files.push(file.name);
                that.refreshView();
            }
        };
        
        that.clear = function () {
            that.model.files = [];
            that.refreshView();
            that.events.afterErrorsCleared.fire();
        };
        
        that.refreshView = function () {
            if (that.model.files.length <= 0) {
                that.container.hide();
                return;
            }
            
            fluid.uploader.errorsView.section.renderHeader(that);
            fluid.uploader.errorsView.section.renderErrorBody(that);
            fluid.uploader.errorsView.section.renderDetailsToggle(that);
            that.container.show();
        };
    };
    
    fluid.uploader.errorsView.section.finalInit = function (that) {        
        // Bind delete button
        that.locate("deleteErrorButton").click(that.clear);

        // Bind hide/show error details link
        that.locate("showHideFilesToggle").click(that.toggleDetails);
        
        // Sections should be hidden on startup.
        that.refreshView();
    };
    
    fluid.uploader.errorsView.section.renderHeader = function (that) {
        var errorTitle = fluid.stringTemplate(that.options.strings.header, {
            numFiles: that.model.files.length
        });
        
        that.locate("errorTitle").text(errorTitle);         
    };
    
    fluid.uploader.errorsView.section.renderDetailsToggle = function (that) {
        that.locate("showHideFilesToggle").text(that.options.strings.showFiles);
        that.locate("errorDetails").hide();
    };
    
    fluid.uploader.errorsView.section.renderErrorBody = function (that) {
        if (that.model.files.length === 0) {
            return;
        }
        
        var filesList = "";        
        for (var i = 0; i < that.model.files.length - 1; i++) {
            var file = that.model.files[i];
            filesList += file + that.options.strings.fileListDelimiter;
        }
        filesList += that.model.files[that.model.files.length - 1];

        that.locate("erroredFiles").text(filesList);
    };
    
    fluid.demands("fluid.uploader.errorsView.section", [
        "fluid.uploader.errorsView", 
        "fluid.uploader.multiFileUploader"
    ], {
        options: {
            listeners: {                
                "{multiFileUploader}.events.onQueueError": "{section}.addFile",
                "{multiFileUploader}.events.onFilesSelected": "{section}.clear",
                "{section}.events.afterErrorsCleared": "{errorsView}.refreshView"
            }
        }
    });
})(jQuery, fluid_1_4);
