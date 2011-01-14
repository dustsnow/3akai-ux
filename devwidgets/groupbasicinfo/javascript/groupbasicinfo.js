/*
 * Licensed to the Sakai Foundation (SF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The SF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */
/*global $ */

var sakai = sakai || {};

/**
 * @name sakai.api.UI.groupbasicinfo
 */
sakai.api.UI.groupbasicinfo = sakai.api.UI.groupbasicinfo || {};
sakai.api.UI.groupbasicinfo.render = sakai.api.UI.groupbasicinfo.render || {};

/**
 * @name sakai.groupbasicinfo
 *
 * @class groupbasicinfo
 *
 * @description
 * Initialize the groupbasicinfo widget
 *
 * @version 0.0.1
 * @param {String} tuid Unique id of the widget
 * @param {Boolean} showSettings Show the settings of the widget or not
 */
sakai.groupbasicinfo = function(tuid, showSettings){

    ///////////////////
    // CSS Selectors //
    ///////////////////

    var $rootel = $("#" + tuid);
    var $groupbasicinfo_generalinfo = $("#groupbasicinfo_generalinfo", $rootel);
    var groupbasicinfo_buttons = "#groupbasicinfo_editing";
    var groupbasicinfo_dontupdate = "#groupbasicinfo_editing_button_dontupdate";
    var groupbasicinfo_update = "#groupbasicinfo_editing_button_update";

    // Fields that will contain the group data
    var groupBasicInfoGroup = "#groupbasicinfo_generalinfo_group";
    var groupBasicInfoGroupTitle = groupBasicInfoGroup + "_title";
    var groupBasicInfoGroupKind = groupBasicInfoGroup + "_kind";
    var groupBasicInfoGroupTags = groupBasicInfoGroup + "_tags";
    var groupBasicInfoGroupDesc = groupBasicInfoGroup + "_description";
    var groupBasicInfoGroupJoinable = groupBasicInfoGroup + "_joinable";
    var groupBasicInfoGroupVisible = groupBasicInfoGroup + "_visible";

    var directoryJSON = [];
    var json = {};

    var groupBasicInfoAddAnotherLocation = "#groupbasicinfo_add_another_location";
    var groupBasicInfoAddAnotherLocationtext = "#groupbasicinfo_add_another_location_text";
    var groupBasicInfoAddAnotherLocationLink = groupBasicInfoAddAnotherLocation + "_link";

    var groupBasicInfoSavedInfo = ".groupbasicinfo_saveddirectory";

    var groupId = sakai.currentgroup.id;
    var groupStoragePrefix = sakai.currentgroup.data.authprofile.path;
    var tagsPath = "/~" + groupId + "/public/tags/";
    var tagsPathForLinking = "/_group" + groupStoragePrefix + "/public/tags/";
    var groupProfileURL = "";

    /**
     * Bind the widget's internal Cancel and Save Settings button
     */
    var addBinding = function(){

        $(groupbasicinfo_dontupdate, $rootel).unbind("click");
        $(groupbasicinfo_dontupdate, $rootel).bind("click", function(){
            sakai.api.Widgets.Container.informCancel(tuid, "groupbasicinfo");
        });

        $(groupbasicinfo_update, $rootel).unbind("click");
        $(groupbasicinfo_update, $rootel).bind("click", function(){
            // disable all basic info input elements while update is processed
            sakai.api.UI.groupbasicinfo.disableInputElements();
            updateGroup();
        });

        $(groupBasicInfoAddAnotherLocation).die("click");
        $(groupBasicInfoAddAnotherLocation).live("click", function(){
            //addAnotherLocation();
            $("#assignlocation_container").jqmShow();
        });

    };


    //////////////////////
    // Render functions //
    //////////////////////

    /**
     * Render the template for group basic info
     */
    var renderTemplateBasicInfo = function(){

        var mode = '';
        // Show in Edit mode
        if (showSettings) {
            mode = 'edit';
        }
        var json = processTagsAndDirectory(mode);

        $groupbasicinfo_generalinfo.html($.TemplateRenderer("#groupbasicinfo_default_template", json));
        $(groupBasicInfoSavedInfo).html($.TemplateRenderer("#groupbasicinfo_generalinfo_directory_list_template", json));

        if (mode === "edit") {
            addBinding();
        }

        // If this widget is not shown on the group profile (i.e. when rendered inside a page)
        // we show the widget's own update button
        if (!sakai.currentgroup.profileView){
            $(groupbasicinfo_buttons, $rootel).show();
        }

    };

    /**
     * Fetch group data
     */
    var getGroupData = function(){
        sakai.api.Groups.getGroupData(groupid, function(success, data) {
            if (success) {
                sakai.currentgroup.id = groupId;
                sakai.currentgroup.data = data;
                if (data.authprofile['rep:policy']) {
                    sakai.currentgroup.manager = true;
                }
                renderTemplateBasicInfo();
            }
        });
    };

    //////////////////////////////
    // Update Group Information //
    //////////////////////////////

    /**
     * Update group data
     */
    var updateGroup = function(){

        // --- validate data ---

        // group title (cannot be blank)
        var groupTitle = $.trim($(groupBasicInfoGroupTitle, $rootel).val());
        if (!groupTitle) {
            groupTitle = sakai.currentgroup.data.authprofile["sakai:group-title"];
        }

        // group kind (should be preset values)
        var groupKind = $(groupBasicInfoGroupKind, $rootel).val();

        // group tags
        var currentTags = [];
        if (sakai.currentgroup.data.authprofile["sakai:tags"]) {
            currentTags = sakai.currentgroup.data.authprofile["sakai:tags"].slice(0);
        }
        var enteredTags = $.trim($(groupBasicInfoGroupTags).val()).split(",");
        if (enteredTags !== currentTags) {
            // user has changed tags
            sakai.currentgroup.data.authprofile["sakai:tags"] = [];
            $(enteredTags).each(function(i, tag) {
                tag = $.trim(tag).replace(/#/g,"");
                if (sakai.api.Security.escapeHTML(tag) === tag && tag.replace(/\\/g,"").length) {
                    if ($.inArray(tag, sakai.currentgroup.data.authprofile["sakai:tags"]) < 0) {
                        sakai.currentgroup.data.authprofile["sakai:tags"].push(tag.replace(/\\/g,""));
                    }
                }
            });
        }

        // Create tags for the directory structure
        // For every groupbasicinfo_added_directory we create tags
        $("#groupbasicinfo_directory li").each(function(ev, value){
            var directory = $(value).attr("class");
            sakai.currentgroup.data.authprofile["sakai:tags"].push(directory);
        });
        
        // group description (can be blank)
        var groupDesc = $.trim($(groupBasicInfoGroupDesc, $rootel).val());

        // group permissions settings
        var joinable = $(groupBasicInfoGroupJoinable).val();
        var visible = $(groupBasicInfoGroupVisible).val();
        if(joinable !== sakai.currentgroup.data.authprofile["sakai:group-joinable"] ||
            visible !== sakai.currentgroup.data.authprofile["sakai:group-visible"]) {
            // only POST if user has changed values
            sakai.currentgroup.data.authprofile["sakai:group-joinable"] = joinable;
            sakai.currentgroup.data.authprofile["sakai:group-visible"] = visible;
            sakai.api.Groups.setPermissions(sakai.currentgroup.id, joinable, visible);
        }

        // Update the group object
        sakai.currentgroup.data.authprofile["sakai:group-title"] = sakai.api.Security.escapeHTML(groupTitle);
        sakai.currentgroup.data.authprofile["sakai:group-kind"] = groupKind;
        sakai.currentgroup.data.authprofile["sakai:group-description"] = sakai.api.Security.escapeHTML(groupDesc);

        sakai.api.Groups.updateGroupInfo(sakai.currentgroup.id, groupTitle, groupDesc, groupKind, function(success) {
            if (success) {
                groupProfileURL = "/~" + sakai.currentgroup.id + "/public/authprofile";
                sakai.api.Util.tagEntity(groupProfileURL, sakai.currentgroup.data.authprofile["sakai:tags"], currentTags, function() {
                    sakai.currentgroup.data.authprofile["sakai:tags"] = currentTags;
                });
            }
            sakai.api.Widgets.Container.informFinish(tuid, "groupbasicinfo");
            $(window).trigger("sakai.groupbasicinfo.updateFinished");
        });
    };

    var addAnotherLocation = function(){
        $("#assignlocation_container").jqmShow();
    };
    
    var processTagsAndDirectory = function(mode){
        // Extract tags that start with "directory:"
        var directory = [];
        var tags = [];
        $(sakai.currentgroup.data.authprofile["sakai:tags"]).each(function(i){
            var splitDir = sakai.currentgroup.data.authprofile["sakai:tags"][i].split("/");
            if (splitDir[0] === "directory") {
                var title = "";
                var curLocation = [];
                for (var j = 1; j < splitDir.length; j++) {
                    if (splitDir.hasOwnProperty(j)) {
                        title += sakai.api.UI.getValueForDirectoryKey(splitDir[j]);
                        curLocation.push(splitDir[j]);
                    }
                    if (j < splitDir.length - 1){
                        title += "<span class='groupbasicinfo_location_divider'>&raquo;</span>";
                    }
                }
                directoryJSON.push(curLocation);
                directory.push({
                    "locationtitle": {
                        "value": sakai.currentgroup.data.authprofile["sakai:tags"][i],
                        "title": title
                    },
                    "id": {
                        "display": false,
                        "value": "" + Math.round(Math.random() * 1000000000)
                    }
                });
            } else {
                tags.push(sakai.currentgroup.data.authprofile["sakai:tags"][i]);
            }
        });
        sakai.currentgroup.data.authprofile.directory = directory;
        sakai.currentgroup.data.authprofile.saveddirectory = directoryJSON;
        // Get the group information out of the global group info object
        json = {
            "groupid" : sakai.currentgroup.id,
            "url" : document.location.protocol + "//" + document.location.host + "/~" + sakai.currentgroup.id,
            "data" : sakai.currentgroup.data.authprofile,
            "mode" : mode,
            "tags" : tags,
            "directory" : directory,
            //"saveddirectory" : directoryJSON,
            /* the following perSectionPermissions switch is used to turn off
               the "Who can view or search this?" permissions dropdown for now.
               The dropdown will need to be enabled and fully implemented later
               on and the following switch can be removed. */
            "perSectionPermissions" : false
        };
        return json;
    };

    var renderLocations = function(data){
        sakai.currentgroup.data.authprofile["sakai:tags"] = data.tags;
        var mode = '';
        // Show in Edit mode
        if (showSettings) {
            mode = 'edit';
        }
        var json = processTagsAndDirectory(mode);
        $(groupBasicInfoSavedInfo).html($.TemplateRenderer("#groupbasicinfo_generalinfo_directory_list_template", json));
    };

    //////////////////////
    // Public Functions //
    //////////////////////

    /**
     * Disable all Group Basic Info input elements (i.e. while processing an update)
     */
    sakai.api.UI.groupbasicinfo.disableInputElements = function () {
        // disable all input elements
        $("#groupbasicinfo_generalinfo input", $rootel).attr("disabled","disabled");
        // disable all textarea elements
        $("#groupbasicinfo_generalinfo textarea", $rootel).attr("disabled","disabled");
        // disable all select dropdowns
        $("#groupbasicinfo_generalinfo select", $rootel).attr("disabled","disabled");
        // disable all buttons
        $("#groupbasicinfo_generalinfo button", $rootel).attr("disabled","disabled");
    };

    /**
     * Enable all Group Basic Info input elements (i.e. after processing an update)
     */
    sakai.api.UI.groupbasicinfo.enableInputElements = function () {
        // enable all input elements
        $("#groupbasicinfo_generalinfo input", $rootel).removeAttr("disabled");
        // enable all textarea elements
        $("#groupbasicinfo_generalinfo textarea", $rootel).removeAttr("disabled");
        // enable all select dropdowns
        $("#groupbasicinfo_generalinfo select", $rootel).removeAttr("disabled");
        // enable all buttons
        $("#groupbasicinfo_generalinfo button", $rootel).removeAttr("disabled");
    };


    ////////////////////
    // Initialization //
    ////////////////////

    /**
     * Render function
     */
    sakai.api.UI.groupbasicinfo.render = function(){
        renderTemplateBasicInfo();
    };

    // Indicate that the widget has finished loading
    $(window).trigger("sakai.api.UI.groupbasicinfo.ready", {});

    // Bind to the global update location
    $(window).bind("sakai-contentmetadata-renderlocations", function(ev, data){
        ev.stopImmediatePropagation();
        // render location in profile Section
        renderLocations(data);
    });

    renderTemplateBasicInfo();
};

sakai.api.Widgets.widgetLoader.informOnLoad("groupbasicinfo");
