   debug = true;
   function easy_image_manager (sliderEntriesContainer) {

        // sliderEntriesContainer = $('.image-items');
        // Le template
        var _templateSlide = _.template($('#imageTemplate').html());
        var is_first_file = true;
        // Les options du FileUpload
        var args = {
            url: CCM_DISPATCHER_FILENAME + '/ccm/system/file/upload',
            dataType: 'json',
            formData: {'ccm_token': CCM_SECURITY_TOKEN},
            add: function (e, data) {
                var goUpload = true;
                var uploadFile = data.files[0];
                if (!(/\.(gif|jpg|jpeg|tiff|png)$/i).test(uploadFile.name)) {
                    alert (ccmi18n.imageOnly);
                    goUpload = false;
                }
                if (uploadFile.size > 6000000) {
                    alert (ccmi18n.imageSize);
                    goUpload = false;
                }
                if (goUpload == true) {
                    data.submit();
                }
            },
            send : function (e, data) {
                // Cette fonction est appelé au moment où les fichiers on été choisis.
                // Si c'est le premier de la liste, on initie le knob sur cette element (celui qui a initié les upload)
                if (is_first_file) {
                    initUploadActionOnItem($(e.target));
                }
                // Si il y a plus d'un chargement, on a besoin de créer pour chaque un nouvel objet
                // Dans ce cas on le crée et on l'assigne à la variable data.newItem
                // On initie aussi le knob
                else {
                    newItem = fillTemplate();
                    data.newItem = newItem;
                    initUploadActionOnItem(newItem);
                }
                is_first_file = false;

            },
            progress: function(e, data) {
                var progress = parseInt(data.loaded / data.total * 100, 10);

                var target = data.newItem ? data.newItem : $(e.target);
                if (progress < 95) {
                    target.find('.knob').val(progress).change();
                } else {
                    target.find('.knob').val(100).change();
                    if(!target.find('canvas').is('.out')) {
                        target.find('canvas').addClass('out');
                        target.find('.process').addClass('in');
                    }
                }
            },
            done: function (e, data) {
                var target = data.newItem ? data.newItem : $(e.target);
                $.get(getFileDetailDetailJson,{fID:data.result[0].fID}, function(file) {
                    fillTemplate(file,target);
                },'json');
            },
            fail: function(r,data) {
                //jQuery.fn.dialog.closeTop();
                var message = r.responseText;
                try {
                    message = jQuery.parseJSON(message).errors.join('<br/>');
                } catch (e) {}
                ConcreteAlert.dialog('Error', message);
            },
            stop: function (e) {
                is_first_file = true;
                fillTemplate();
            }
        };

        $.fn.replaceWithPush = function(a) {var $a = $(a);this.replaceWith($a);return $a;};


        // Quand on clique sur le cadre on déclenche l'ouverture du navigateur de fichier Navigateur
        var attachUploadEvent = function ($obj) {
            // On lance le fileupload
            $obj.fileupload(args);
            $inputfile = $obj.find('input.browse-file');
            $obj.find('.upload-file').on('click',function(e){
                e.preventDefault();
                $inputfile.click();
            });
        }

        var initUploadActionOnItem = function ($obj) {
            $obj.find('.knob').knob();
            $obj.find('.add-file-control').hide();
        }


        var attachDelete = function($obj) {
            $obj.find('.remove-item').click(function(){
                var deleteIt = confirm(ccmi18n.confirmDeleteImage);
                if(deleteIt == true) {
                   $(this).closest('.image-item').remove();
                   refreshManager ();
                }
            });
        }

        var attachFileManagerLaunch = function($obj) {

            $obj.find('.add-file').click(function(event){
                event.preventDefault();
                var Launcher = $obj;
                ConcreteFileManager.launchDialog(function (data) {
                    // data : Object {fID: "1"}
                    $.get(getFileDetailDetailJson,{fID:data.fID}, function(file) {
                        if(file.generic_type == "1"){ // if(file.type == "Image"){
                            jQuery.fn.dialog.hideLoader();
                            fillTemplate(file,Launcher);
                           // On ajoute un nouvel element vide a coté
                            fillTemplate();
                            return;
                        } ;
                        jQuery.fn.dialog.hideLoader();
                        alert('You must select an image file only')

                    },'json');
                });
            });
        }

        var initImageEdit = function ($obj,file) {
            $obj.find(".dialog-launch").dialog();

            $obj.find('.editable-click').editable({
                ajaxOptions: {dataType: 'json'},
                emptytext: ccmi18n.none,
                showbuttons: true,
                url: saveFieldURL,
                params:{fID:file.fID},
                pk: '_x',
                success:function(data) {
                  // On doit tester la valeur du type et afficher le just input correspndant au type
                  var container = $(this).closest('.image-item');
                  l(container);
                  if(data.name == 'link_type'){
                    switch(data.value) {
                        case 'URL':
                            container.find('div[data-field=entry-link-page-selector]').hide();
                            container.find('div[data-field=entry-link-url]').show();
                            break;
                        case 'Page':
                            container.find('div[data-field=entry-link-url]').hide();
                            container.find('div[data-field=entry-link-page-selector]').show();
                            break;
                        default:
                            container.find('div[data-field=entry-link-page-selector]').hide();
                            container.find('div[data-field=entry-link-url]').hide();
                            break;
                    }

                  };
                  // if(typeof data == 'object' && !data.success) return data.msg;
                }

            });
            // Faire en sorte que les infos restent visibles quand on edite le titre ou la description
            $obj.find('.editable-click').on('shown', function (data) {
                    $(data.target).closest('.item-toolbar').addClass('active');
            });
            $obj.find('.editable-click').on('hidden', function (data) {
                    $(data.target).closest('.item-toolbar').removeClass('active');
            });
            // $obj.find('[data-page-selector]').concretePageSelector({'inputName': 'display_', 'cID': 275});

        }

        fillTemplate = function (file,$element) {

            var defaults = { fID: '', title: '', link_url: '',internal_link_cid:0,link_type:'', cID: '', description: '', sort_order: '', image_url: ''};
            if (file) $.extend(defaults, {fID: file.fID, title: file.title, description: file.description, sort_order: '', image_url: file.urlInline,internal_link_cid:file.internal_link_cid, link_type:file.link_type});

            if ($element) {
                //  on est dans le cas ou l'utilisateur a uploadé ou choisi un fichier
                // dans ce cas on replace le carré vide par un element rempli avec image et tout le toutim
               var newSlide = $element.replaceWithPush(_templateSlide(defaults));

            } else {

                // On ajoute un nouveau avec ou sans infos
                sliderEntriesContainer.append(_templateSlide(defaults));
                var newSlide = $('.image-item').last();

            }
            // Si le carré est vide, il faut activer les bouton de remplissage
            if (!file) {
                attachFileManagerLaunch(newSlide);
                attachUploadEvent(newSlide);
            } else {
                attachDelete(newSlide);
                initImageEdit(newSlide,file);
                // Retirer tous l'input file qui ne vient que surcharger les données envoyées
                // Et qui n'ont servi qu'a uploder un fichier
                newSlide.find('.browse-file').remove();
                // Mettre à jour le fID
                newSlide.find('.image-fID').val(file.fID);
            }

            newSlide.find('[data-field=entry-link-page-selector]').concretePageSelector({
                'inputName': 'internal_link_cid[' + defaults.fID + '][]', 'cID':defaults.internal_link_cid
            })

            refreshManager ();

            return newSlide;
        }

        var refreshManager = function () {
            // Deplacer le carré vide à la dernière place
            $('.image-item').not('.filled').appendTo(sliderEntriesContainer);
            // On permet la réorganisation
            sliderEntriesContainer.sortable({handle: ".handle"});
            // On regarde si on desactive ou pas le bouton submit
            // en comptant les carré rempli d'image
            var b = $('#easy_image_save');
            if(!$('.image-item.filled').size()) {
                b.addClass('disabled');
            } else if (b.is('.disabled')) {
                b.removeClass('disabled');
            };

        }

        var addFileset = function (fsID) {
          if ($.inArray(fsID, selectedFilesets) > -1) {
              var addImages = confirm(ccmi18n.filesetAlreadyPicked );
              if(addImages == false) return;
          } else {
              selectedFilesets.push(fsID);
          }

          // on rempli le container d'hidden qui rerésentent les fsID
          $("#fsIDs").empty();
          $.each(selectedFilesets, function(index, value) {
            if (value)
              $('<input type="hidden" name="fsIDs[]" />').val(this).appendTo('#fsIDs');
          });

          $.get(getFilesetImagesURL,{fsID:fsID}, function(data) {
              if(data.length) {
                  $.each(data,function(i,f){
                      fillTemplate(f);
                      refreshManager ();

                  });
                  t.val(0);
              }
          },'json');
        }

        // -- Quand on choisi un Fileset -- \\

        $('#fsID').change(function(){
            var t = $(this);
            var v = t.val();
            addFileset(v);
        });


        // Simple option open
        $('#options-button').on('click',function(e){
            $('#advanced-options-content').slideUp();
            $('#options-content').slideToggle();
        });
        // Advanced options open
        $('#advanced-options-button').on('click',function(e){
            $('#options-content').slideUp();
            $('#advanced-options-content').slideToggle();

        });
        // Closes buttons
        $('.easy_image_options_close').on('click',function(e){
            $('.options-content').slideUp();
        });

        // -- On crée le premier ou le dernier carré -- //
        fillTemplate();
};

function l() {
    if(debug==true) {
        for (var i=0; i < arguments.length; i++) {
            console.log(arguments[i]);
        }
    }
}

var submitBlockForm = function () {
    $('#ccm-block-form').submit();
    ConcreteEvent.fire('EditModeExitInlineSaved');
    ConcreteEvent.fire('EditModeExitInline', {
        action: 'save_inline'
    });
}

function cancelBlockForm () {
    ConcreteEvent.fire('EditModeExitInline');
    Concrete.getEditMode().scanBlocks();
}