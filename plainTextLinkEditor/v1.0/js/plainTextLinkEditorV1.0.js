/*

	Plain Text Link Editor v1.0
	
	OVERVIEW:
	
	Allows designation of hyperlinks in a textarea, which are merged into an HTML string at save. Supports import of markup 
	which is converted to link signifiers, which appear like this in the textarea:
	
	[__ some link text __]
	

	CONSTRUCTOR:
	
		@PARAM: argObject (object)
			properties: 
			{
				editorId: editor instance container id string
				onClickGetLinks: callback for when user clicks 'add link', used to prompt the server side to present the link selector
				onClickSave: callback for when user clicks 'save essay'
			}
		@RETURN:
			setEditorContent : called on instance of object to load content
				@PARAM: content [HTML String]
				@RETURN: true on succesful load, false if no content supplied
				HTML string can consist of any valid html, but only <a> tags will be parsed out to an array
				All other html tags will be stripped from the input
				
			getEditorContent : called on instance of object to retrieve content (no params)
				@RETURN: Content [HTML string] containing only <p> and <a> tags
				The returned html string will be enclosed in a <p> tag, with line breaks converted 
				to the sequence '</p><p>', providing paragraphs at each line break
				<a> tags will be generated for each link signifier '[__ some text __], at the
				appropriate location in the string
				
			showMessage : Called on instance of object to display an error message in the editor (no return)
				@PARAM: message [string]
				
			setLink : called on instance of object to set a link (will only work when there's a selection in the editor)
				@PARAM: <a> tag complete [string]
				@RETURN: true if link set, false if no selection
				
			
		
	REQUIRED MARKUP:

	Sample of the minimum required markup for component to function.
	The ID of the containing div is required as one argument to the constructor
	All other component functions are handled via classes and markup hierarchy
	
	<div id="textEditor1" class="editor-instance">
		<div class="messages-container"><div class="messages"></div></div>
		<div>
			<form>
				<input class="action-save-essay" type="button" value="Save Essay">
				<input class="action-set-link" type="button" disabled="" value="Add Link" title="Select text then click button to add a link">
				<input class="action-del-link" type="button" value="Remove Link" style="display:none">
				<a href="#" class="action-view-link" style="display:none;">View Link</a>
				<textarea class="editor" rows="18"></textarea>
			</form>
		</div>
	</div>
	
	KNOWN ISSUES:
	
	---	If user pastes in something like '[___ some text ___]' and then deletes one of the underscores, 
		it begins to behave as if it were a link identifier
	
	
			
*/

var plainTextLinkEditor = function(argObject){
	"use strict";

	// PUBLIC API
	var publicRef = {
		setEditorContent : function(content){
			return innerRef.loadEditorContent(content);
		},
		getEditorContent : function(){
			return innerRef.saveEditorContents();
		},
		showMessage : function(message){
			return innerRef.showWarning(message);
		},
		setLink : function(htmlString){
			return innerRef.setLink(htmlString);
		}
	};
	
	var innerRef = {
		
		$editorInstance : $('#' + argObject.editorId),
		onClickGetLinks : argObject.onClickGetLinks,
		onClickSave : argObject.onClickSave,
		savedLinks : [],
		bracketReplaceRegex : /(\[__[a-zA-Z0-9,\.\[\]\{\}\!\?\\\/@#\$5\^7\*\(\)\-_\=\+\;\:"'\\<\>\ ]+?__\])/gi,
		bracketOverlapRegex : /__\][a-zA-Z0-9,\.\[\]\{\}\!\?\\\/@#\$%\^&\*\(\)\-_\=\+\;\:"'\\<\>\ ]+?\[__/gi,
		openBracketRegex : /\[__[^_]/gi,
		closeBracketRegex : /[^_]__\]/gi,
		replaceCount : 0,
		linebreakRegex : /[\r\n]+/gi,
		preventPaste : false,
		currentSelection : [],

		addLinkToArray : function(method,link,index) {
			// index is only needed for array insertion
			if(method === 'push'){
				this.savedLinks.push(link);
			}
			else if(method === 'unshift'){
				this.savedLinks.unshift(link);
			}
			else if(method === 'insert'){
				this.savedLinks.splice(index,0,link);
			}
		},
		
		linkArrayPosition : function(){
			var output = 0,
				count = this.currentSelection[1]+2,
				searchText = this.$editorInstance.find('.editor').val().slice(0,count);	
			var regexOutput = searchText.match(this.openBracketRegex);
			if(regexOutput){
				output = regexOutput.length;
			}
			return output;
		},
		
		showExistingLinkTools : function(){
			var linkId = this.linkArrayPosition();
			if(linkId > 0){
				var link = this.savedLinks[linkId-1];
				// in the next line, we clone the <a> node temporarily, so we can html() the whole link
				// then use text to replace the link text
				if(link){
					var linkHtml = $('<div>').append($(link).clone()).remove().html();
					var prevLinkId = this.$editorInstance.find('.action-view-link').attr('id');
					var prevLinkClass = this.$editorInstance.find('.action-view-link').attr('class');
					var titleText = $(linkHtml).attr('title');
					if(!titleText){
						titleText = '';
					}
					var newTitle = 'Go to: ' + titleText + ' [' + $(linkHtml).attr('href') + ']';
					this.$editorInstance.find('.action-view-link').replaceWith(
						$(link).addClass(prevLinkClass).attr('id',prevLinkId).css('display','').attr('title',newTitle).text('View Link')
					);
					this.$editorInstance.find('.action-del-link').attr('data-link-id',linkId-1).show();
				}
			}
		},
		
		getSelected : function() {
			var $editor = this.$editorInstance.find('.editor');
			var u		= $editor.val();
			var start	= $editor.get(0).selectionStart;
			var end		= $editor.get(0).selectionEnd;
			return [start, end, u.substring(start, end)];
		},
		
		selectInEditor : function(){
			this.clearWarning();
			this.resetEditor();
			this.currentSelection = this.getSelected();
			if(this.selectionIsWithinLink()){
				if(!this.multipleSelect()){
					this.showExistingLinkTools();
				} else {
					innerRef.showWarning('More than one link selected, cannot show link tools');
				}
			}
			else if(this.currentSelection[2].length > 0){
				this.$editorInstance.find('.action-set-link').removeAttr('disabled');
			} else {
				this.$editorInstance.find('.action-set-link').attr('disabled','true');
			}
		},

		multipleSelect : function(){
			var output = false,
				matches,
				selectionText = this.currentSelection[2],
				openBracket = selectionText.indexOf('['),
				closeBracket = selectionText.indexOf(']'),
				underscore = selectionText.indexOf('_'),
				expandedSelection = this.$editorInstance.find('.editor').val().slice((this.currentSelection[0]-3),(this.currentSelection[1]+3));
			
			if(this.currentSelection[2].length === this.$editorInstance.find('.editor').val().length){
				expandedSelection = this.$editorInstance.find('.editor').val();
			}
			
			
			if((openBracket > -1 || closeBracket > -1) && underscore > -1){
				matches = expandedSelection.match(this.bracketOverlapRegex);
				if(matches){
					output = true;
				}
			}
			return output;
		},

		selectionIsWithinLink : function(){
			var selection = this.currentSelection;
			var output = false,
				count = selection[1],
				searchText = this.$editorInstance.find('.editor').val(),
				selectionType = 'point';

			if(selection[2] !== ''){
				selectionType = 'range';	
			}
		
			for(count;count>=0;count--){
			
				if(selectionType === 'point'){
					
					if(searchText.charAt(count) === ']'){
						
						if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '_' && count < selection[0]){
							// this means we're beyond a closing tag
							break;
						}
					}
					
					if(searchText.charAt(count) === '_'){
						
						if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '[' && count < selection[0]){
							// fires when point is between open and close
							output = true;
							break;
						}
						if(searchText.charAt(count+1) === '_' && searchText.charAt(count-1) === '['){
							// fires when point is between open and close
							this.preventPaste = true;
							output = true;
							break;
						}
						if(searchText.charAt(count+1) === '_' && searchText.charAt(count+2) === ']' && count < selection[0]){
							// fires when point is between open and close
							this.preventPaste = true;
							output = true;
							break;
						}
					}
				}
				
				else if(selectionType === 'range'){
					
					if(searchText.charAt(count) === ']'){
						
						if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '_' && count >= selection[0] && count <= selection[1]){
							// fires when range overlaps the closing tag
							this.preventPaste = true;
							output = true;
							break;
						}
						
						if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '_' && count < selection[0] ){
							// fires when range is outside of tag
							break;
						}
					}

					else if(searchText.charAt(count) === '_'){
						
						if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '[' && count < selection[0]){
							// fires when selection is entirely within a link
							output = true;
							break;
						}
						
						if(searchText.charAt(count-1) === '_' && searchText.charAt(count-2) === '[' && count >= selection[0]){
							// fires when selection overlaps open tag
							this.preventPaste = true;
							output = true;
							break;
						}
					}
				}	
			}
			
			return output;
			
		},
		
		prepareLinkSelector : function() {
			if(this.currentSelection[2].length > 0){
				this.$editorInstance.find('.action-set-link').attr('disabled','true');
				//this.selectText(this.$editorInstance.find('.editor').get(0),this.currentSelection[0],this.currentSelection[1]);
				this.onClickGetLinks(this.$editorInstance);
			}
		},
		
		setLink : function(link){
			if(this.currentSelection[2].length > 0){
				// in the next line, we clone the <a> node temporarily, so we can html() the whole link
				// then use text to replace the link text
				link = $('<div>').append($(link).clone().text(this.currentSelection[2])).remove().html();
				var textareaContent = this.$editorInstance.find('.editor').val();
				var priorLinks = this.linkArrayPosition(this.currentSelection);
				if(priorLinks === 0){
					this.addLinkToArray('unshift',link);
				}
				else if(priorLinks === this.savedLinks.length){
					this.addLinkToArray('push',link);
				}
				else {
					this.addLinkToArray('insert',link,priorLinks);
				}
				
				var output = [textareaContent.slice(0,this.currentSelection[0]),'[__',this.currentSelection[2],'__]',textareaContent.slice(this.currentSelection[1])].join('');
				this.$editorInstance.find('.editor').val(output);
				this.$editorInstance.find('.action-set-link').attr('disabled','true');
				this.$editorInstance.find('.action-del-link').attr('data-link-id',this.savedLinks.length);
				// manually set the selection to nothing 
				// prevents Ie default behavior of selecting entire editor
				var editor = this.$editorInstance.find('.editor').get(0);
				editor.selectionStart = editor.selectionEnd = -1;
				this.resetEditor();
				this.currentSelection = [];
				return true;
			} else {
				return false;
			}
		},
		
		deleteLink : function($target){
			var count = 0,
				linkCount = 0,
				searchText = this.$editorInstance.find('.editor').val(),
				searchTextLength = searchText.length,
				targetId = parseInt($target.attr('data-link-id'),10);

			for(count; count<searchTextLength; count++){
				if(searchText.charAt(count) === '[' && searchText.charAt(count+1) === '_' && searchText.charAt(count+2) === '_'){
					var bracket1 = count;
					var bracket2 = count+1;
					if(linkCount === targetId){
						for(count; count<searchTextLength; count++){
							if(searchText.charAt(count) === '_' && searchText.charAt(count+1) === '_' && searchText.charAt(count+2) === ']'){
								searchText = searchText.slice(0,bracket1) + searchText.slice((bracket2+2),count) + searchText.slice(count+3);
								this.$editorInstance.find('.editor').val(searchText);
								this.resetEditor();
								break;
							}
						}
						this.savedLinks.splice(targetId,1);
						break;
					} 
					linkCount++;
				}
			}
		},
		
		replaceIncomingLinks : function(html){
			var $output = $(html);
			$output.find('a').each(function(){
				// in the next line, we clone the <a> node temporarily, so we can html() the whole link
				var anchorString = $('<div>').append($(this).clone()).remove().html();
				innerRef.addLinkToArray('push',anchorString);
				var linkText = '[__' + $(this).text() + '__]';
				$(this).text(linkText);
			});
			return $output;
		},
		
		loadEditorContent : function(content){
			if(!content){
				return false;
			}
			var $newContent = $(this.replaceIncomingLinks(content));
			var newTextContent = $newContent.text();
			var replaceOpenAngles = newTextContent.replace(/(?:&lt;)/gi,'<');
			var replaceClosedAngles = replaceOpenAngles.replace(/(?:&gt;)/gi,'>');
			this.$editorInstance.find('.editor').val(replaceClosedAngles);
			return true;
		},
		
		replaceBrackets : function(match){
			var bracketsRemoved = match.slice(3,-3);
			var $linkUrl = $(innerRef.savedLinks[innerRef.replaceCount]);
			innerRef.replaceCount++;
			$linkUrl.text(bracketsRemoved);
			// in the next line, we clone the <a> node temporarily, so we can html() the whole link
			var anchorString = $('<div>').append($linkUrl.clone()).remove().html();
			return anchorString;
		},
		
		// this returns an html string with only the following elements: anchor,paragraph
		// the entire string is wrapped in a p tag, and linebreaks are converted to a close para - open para
		// note also that existing angle-brackets are converted to entities
		saveEditorContents : function(){
			this.replaceCount = 0;
			var rawContent = this.$editorInstance.find('.editor').val().trim();
			// need to add entity replcaement for angle brackets
			var replaceOpenAngles = rawContent.replace(/</gi,'&lt;');
			var replaceClosedAngles = replaceOpenAngles.replace(/>/gi,'&gt;');
			var replacedLinks = replaceClosedAngles.replace(this.bracketReplaceRegex,this.replaceBrackets);
			var replacedContent = replacedLinks.replace(this.linebreakRegex,'</p><p>');
			this.resetEditor();
			return replacedContent;
		},
		
		resetEditor : function(){
			this.preventPaste = false;
			this.$editorInstance.find('.action-set-link').attr('disabled','true');
			this.$editorInstance.find('.action-view-link').removeAttr('data-link-location').attr('title','').hide();
			this.$editorInstance.find('.action-del-link').removeAttr('data-link-id').hide();
		},
		
		resetAllEditors : function(){
			$('.action-set-link').attr('disabled','true');
			$('.action-view-link').removeAttr('data-link-location').attr('title','').hide();
			$('.action-del-link').removeAttr('data-link-id').hide();
		},
		
		inspectPaste : function(priorText){
			setTimeout(function(){
				var errorState = false;
				var pastedTextLength = innerRef.$editorInstance.find('.editor').val().length - priorText.length;
				var pasteStop = innerRef.currentSelection[0] + pastedTextLength;
				var pastedText = innerRef.$editorInstance.find('.editor').val().slice(innerRef.currentSelection[0],pasteStop);
				var selectStartPlus = 0;
				if(innerRef.currentSelection[0] > 2){
					selectStartPlus = innerRef.currentSelection[0]-3;
				}
				var pastedTextPlus = innerRef.$editorInstance.find('.editor').val().slice(selectStartPlus,pasteStop+3);
				if(pastedText.match(innerRef.openBracketRegex)){
					errorState = true;
				}
				else if(pastedText.match(innerRef.closeBracketRegex)){
					errorState = true;
				}
				else if(pastedTextPlus.match(innerRef.openBracketRegex)){
					errorState = true;
				}
				else if(pastedTextPlus.match(innerRef.closeBracketRegex)){
					errorState = true;
				}
				else {
					innerRef.resetEditor();
				}
				if(errorState){
					innerRef.showWarning('Please remove link formatting characters and retry pasting.','warning');
					innerRef.$editorInstance.find('.editor').val(priorText);
				}
			},10);
		},
		
		showWarning : function(message,type){
			var messageClass = 'alert-';
			if(!type){
				messageClass += 'info'; 
			} else {
				messageClass += type; 
			}
			var $messageBlock = this.$editorInstance.find('.messages');
			$messageBlock.removeClass('alert-warning alert-info alert-success alert-danger').addClass(messageClass).text(message).css('display','block');
			setTimeout(innerRef.clearWarning,4000);
		},
		
		clearWarning : function(){
			innerRef.keyPressFired = false;
			innerRef.$editorInstance.find('.messages').fadeOut(1000, function(){
				$(this).text('').css('display','none');
				innerRef.previousWarning = '';
			});
		},
		
		keyPressFired : false,
		
		
		isRestrictedChar : function(testChar){
			var output = false;
			if($.inArray(testChar,this.restrictedChars) > -1){
				output = true;
			}
			return output;
		},
		
		// Key codes for keys we override in certain circumstances
		// set setCharArray above for the addition of alphabetical chars
		restrictedChars : [8,10,12,,13,32,34,45,46,48,49,50,51,52,53,54,55,56,57,58,59,60,61,62,
							63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,
							87,88,89,90,91,92,96,97,98,99,100,101,102,103,104,105,106,107,109,110,
							111,112,173,186,187,188,189,190,191,192,219,220,221,222],
		
		isEditableBracketUnderscore : function(position,code){
			var positionBefore = 0,
				positionAfter = position+1,
				output = true,
				text = '',
				hit;
			
			if(position > 2){
				positionBefore = position-3;
			}
			
			if(code === 109 || code === 189 || code === 173){
				// character = '_';
				text = this.$editorInstance.find('.editor').val().slice(positionBefore,positionAfter+2);
				hit = text.indexOf('[_');
				if(hit === -1){
					hit = text.indexOf('_]');
				}
			}
			if(code === 219){
				// character = '[';
				text = this.$editorInstance.find('.editor').val().slice(positionBefore,positionAfter+1);
				hit = text.indexOf('__');
			}
			if(code === 221){
				// character = ']';
				text = this.$editorInstance.find('.editor').val().slice(positionBefore,positionAfter-1);
				hit = text.indexOf('__');
			}
			
			if(hit > -1){
				output = false;
			}

			return output;

		},
		
				
		// this method can automatically select text
		// commented out for now, but may be useful
		// selectText : function(textarea,startPos,endPos){
			//Chrome / Firefox
			// if(typeof(textarea.selectionStart) !== "undefined") {
				// textarea.focus();
				// textarea.selectionStart = startPos;
				// textarea.selectionEnd = endPos;
			// }
			//IE
			// if (document.selection && document.selection.createRange) {
				// textarea.focus();
				// textarea.select();
				// var range = document.selection.createRange();
				// range.collapse(true);
				// range.moveEnd("character", endPos);
				// range.moveStart("character", startPos);
				// range.select();
			// }
		// },
		
		
		init : function($editorInstance){

			$editorInstance.on('contextmenu',function(e){ 
				if(!innerRef.preventPaste){
					var priorText = innerRef.$editorInstance.find('.editor').val();
					innerRef.inspectPaste(priorText);
				} else {
					e.stopPropagation();
					e.preventDefault();
					innerRef.showWarning('Please make a new selection. Cut/paste/delete is not allowed here','warning');
				}
			});
			
			$editorInstance.on('keydown',function(e){ //keypress 
				var code = (e.keyCode ? e.keyCode : e.which),
					position = $editorInstance.find('.editor').prop("selectionStart"),
					text = $editorInstance.find('.editor').val(),
					isError = false;

				if((e.ctrlKey && code === 65) || (e.ctrlKey && code === 67)){			
					$(this).one('keyup',function(){
						innerRef.selectInEditor();
					});
				}
				else if(code === 37 || code === 38 || code === 39 || code === 40){
					$(this).one('keyup',function(){
						innerRef.selectInEditor();
					});
				}
				else if(innerRef.preventPaste && innerRef.isRestrictedChar(code)){
						e.preventDefault();
						e.stopPropagation();
						e.returnValue = false;
						if(!innerRef.keyPressFired){
							innerRef.showWarning('Please make another selection. Cannot edit across a link signifier','warning');
							innerRef.keyPressFired = true;
						}
						return false;
					
				} else {
				
					if(code === 109 || code === 189 || code === 173){
						if(!innerRef.isEditableBracketUnderscore(position,code)){
							e.preventDefault();
							e.returnValue = false;
							innerRef.showWarning('Sorry, the sequences "[__" or "__]" are not permitted. Underscore removed.','warning');
						}
					} 
					else if(code === 219 || code === 221){
						if(!innerRef.isEditableBracketUnderscore(position,code)){
							e.preventDefault();
							e.returnValue = false;
							innerRef.showWarning('Sorry, the sequences "[__" or "__]" are not permitted. Bracket removed.','warning');
						}
					}
					

					// Backspace key
					if(code === 8){

						if(((text.charAt(position-1) === ']' && text.charAt(position-2) === '_' && text.charAt(position-3) === '_') ||
							(text.charAt(position) === ']' && text.charAt(position-1) === '_' && text.charAt(position-2) === '_')  ||
							(text.charAt(position+1) === ']' && text.charAt(position) === '_' && text.charAt(position-1) === '_')) ||
							
							((text.charAt(position-1) === '_' && text.charAt(position-2) === '_' && text.charAt(position-3) === '[') ||
							(text.charAt(position) === '_' && text.charAt(position-1) === '_' && text.charAt(position-2) === '[')  ||
							(text.charAt(position+1) === '_' && text.charAt(position) === '_' && text.charAt(position-1) === '['))){
							isError = true;
						} 
						else if(innerRef.preventPaste){
							isError = true;
						}
						if(isError){
							e.preventDefault();
							e.returnValue = false;
							innerRef.showWarning('Please use the remove link button to remove a link');
							return false;
						}
					}

					// Delete Key
					if(code === 46){

						if(((text.charAt(position) === ']' && text.charAt(position-1) === '_' && text.charAt(position-2) === '_') ||
							(text.charAt(position+1) === ']' && text.charAt(position) === '_' && text.charAt(position-1) === '_')  ||
							(text.charAt(position+2) === ']' && text.charAt(position+1) === '_' && text.charAt(position) === '_')) ||
							
							((text.charAt(position) === '_' && text.charAt(position-1) === '_' && text.charAt(position-2) === '[') ||
							(text.charAt(position) === '_' && text.charAt(position+1) === '_' && text.charAt(position-1) === '[')  ||
							(text.charAt(position+2) === '_' && text.charAt(position+1) === '_' && text.charAt(position) === '['))){
							
							isError = true;
						} 
						else if(innerRef.preventPaste){
							isError = true;
						}
						if(isError){
							e.preventDefault();
							e.returnValue = false;
							innerRef.showWarning('Please use the remove link button to remove a link');
							return false;
						}
					}
				}
			});
			
			$editorInstance.on('click','.action-set-link',function(){
				innerRef.prepareLinkSelector();
			});

			$editorInstance.on('mousedown','.editor',function(){
				innerRef.resetEditor();
				innerRef.preventPaste = false;
				$(this).one('mouseup mouseleave',function(){
					innerRef.selectInEditor();
				});
				
				
			});
			
			$('body').on('mousedown',function(e){
				if(!$(e.target).is('input') && !$(e.target).is('select') && !$(e.target).is('option') && !$(e.target).is('a')){
					//if click registers that is not on a button, reset the editor state
					innerRef.resetAllEditors();
					innerRef.preventPaste = false;
				}
			});
			
			$editorInstance.on('click','.action-del-link',function(){
				innerRef.deleteLink($(this));
			});
			
			$editorInstance.on('click','.action-save-essay',function(){
				innerRef.onClickSave(innerRef.saveEditorContents());
			});
			
			$editorInstance.on('paste cut',function(e){
				if(!innerRef.preventPaste){
					var priorText = innerRef.$editorInstance.find('.editor').val();
					innerRef.inspectPaste(priorText);
				} else {
					e.stopPropagation();
					e.preventDefault();
					innerRef.showWarning('Please select outside of link. Cut/paste is not allowed for current selection','warning');
				}
			});
		}
	};
	
	innerRef.init(innerRef.$editorInstance);
	
	return publicRef;
};
