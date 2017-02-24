/* globals _, Backbone, DiscussionTopicMenuView, DiscussionUtil, Thread */
(function() {
    'use strict';
    var __hasProp = {}.hasOwnProperty,
        __extends = function(child, parent) {
            for (var key in parent) {
                if (__hasProp.call(parent, key)) {
                    child[key] = parent[key];
                }
            }
            function ctor() {
                this.constructor = child;
            }

            ctor.prototype = parent.prototype;
            child.prototype = new ctor();
            child.__super__ = parent.prototype;
            return child;
        };

    if (typeof Backbone !== 'undefined' && Backbone !== null) {
        this.NewPostView = (function(_super) {
            __extends(NewPostView, _super);

            function NewPostView() {
                var self = this;
                this.updateStyles = function() {
                    return NewPostView.prototype.updateStyles.apply(self, arguments);
                };
                this.resetForm = function() {
                    return NewPostView.prototype.resetForm.apply(self, arguments);
                };
                return NewPostView.__super__.constructor.apply(this, arguments);
            }

            NewPostView.prototype.initialize = function(options) {
                var _ref;
                this.mode = options.mode || 'inline';
                if ((_ref = this.mode) !== 'tab' && _ref !== 'inline') {
                    throw new Error('invalid mode: ' + this.mode);
                }
                this.course_settings = options.course_settings;
                this.is_commentable_cohorted = options.is_commentable_cohorted;
                this.topicId = options.topicId;
            };

            NewPostView.prototype.render = function() {
                var context, threadTypeTemplate;
                context = _.clone(this.course_settings.attributes);
                _.extend(context, {
                    cohort_options: this.getCohortOptions(),
                    is_commentable_cohorted: this.is_commentable_cohorted,
                    mode: this.mode,
                    form_id: this.mode + (this.topicId ? '-' + this.topicId : '')
                });
                this.$el.html(_.template($('#new-post-template').html())(context));
                threadTypeTemplate = _.template($('#thread-type-template').html());
                if ($('.js-group-select').prop('disabled')) {
                    $('.group-selector-wrapper').addClass('disabled');
                }
                this.addField(threadTypeTemplate({
                    form_id: _.uniqueId('form-')
                }));
                if (this.isTabMode()) {
                    this.topicView = new DiscussionTopicMenuView({
                        topicId: this.topicId,
                        course_settings: this.course_settings
                    });
                    this.topicView.on('thread:topic_change', this.toggleGroupDropdown);
                    this.addField(this.topicView.render());
                }
                return DiscussionUtil.makeWmdEditor(this.$el, $.proxy(this.$, this), 'js-post-body');
            };

            NewPostView.prototype.addField = function(fieldView) {
                return this.$('.forum-new-post-form-wrapper').append(fieldView);
            };

            NewPostView.prototype.isTabMode = function() {
                return this.mode === 'tab';
            };

            NewPostView.prototype.getCohortOptions = function() {
                var userCohortId;
                if (this.course_settings.get('is_cohorted') && DiscussionUtil.isPrivilegedUser()) {
                    userCohortId = $('#discussion-container').data('user-cohort-id');
                    return _.map(this.course_settings.get('cohorts'), function(cohort) {
                        return {
                            value: cohort.id,
                            text: cohort.name,
                            selected: cohort.id === userCohortId
                        };
                    });
                } else {
                    return null;
                }
            };

            NewPostView.prototype.events = {
                'keypress .forum-new-post-form input:not(.wmd-input)': function(event) {
                    return DiscussionUtil.ignoreEnterKey(event);
                },
                'submit .forum-new-post-form': 'createPost',
                'change .post-option-input': 'postOptionChange',
                'click .cancel': 'cancel',
                'click  .add-post-cancel': 'cancel',
                'reset .forum-new-post-form': 'updateStyles'
            };

            NewPostView.prototype.toggleGroupDropdown = function($target) {
                if ($target.data('cohorted')) {
                    $('.js-group-select').prop('disabled', false);
                    return $('.group-selector-wrapper').removeClass('disabled');
                } else {
                    $('.js-group-select').val('').prop('disabled', true);
                    return $('.group-selector-wrapper').addClass('disabled');
                }
            };

            NewPostView.prototype.postOptionChange = function(event) {
                var $optionElem, $target;
                $target = $(event.target);
                $optionElem = $target.closest('.post-option');
                if ($target.is(':checked')) {
                    return $optionElem.addClass('is-enabled');
                } else {
                    return $optionElem.removeClass('is-enabled');
                }
            };

            NewPostView.prototype.createPost = function(event) {
                var anonymous, anonymousToPeers, body, follow, group, threadType, title, topicId, url,
                    self = this;
                event.preventDefault();
                threadType = this.$('.input-radio:checked').val();
                title = this.$('.js-post-title').val();
                body = this.$('.js-post-body').find('.wmd-input').val();
                group = this.$('.js-group-select option:selected').attr('value');
                anonymous = false || this.$('.js-anon').is(':checked');
                anonymousToPeers = false || this.$('.js-anon-peers').is(':checked');
                follow = false || this.$('input[name=follow]').is(':checked');
                topicId = this.isTabMode() ? this.topicView.getCurrentTopicId() : this.topicId;
                url = DiscussionUtil.urlFor('create_thread', topicId);
                return DiscussionUtil.safeAjax({
                    $elem: $(event.target),
                    $loading: event ? $(event.target) : void 0,
                    url: url,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        thread_type: threadType,
                        title: title,
                        body: body,
                        anonymous: anonymous,
                        anonymous_to_peers: anonymousToPeers,
                        auto_subscribe: follow,
                        group_id: group
                    },
                    error: DiscussionUtil.formErrorHandler(this.$('.post-errors')),
                    success: function(response) {
                        var thread;
                        thread = new Thread(response.content);
                        self.$el.addClass('is-hidden');
                        self.resetForm();
                        self.trigger('newPost:createPost');
                        return self.collection.add(thread);
                    }
                });
            };

            NewPostView.prototype.formModified = function() {
                var postBodyHasContent = this.$('.js-post-body').find('.wmd-input').val() !== '',
                    titleHasContent = this.$('.js-post-title').val() !== '';
                return postBodyHasContent || titleHasContent;
            };

            NewPostView.prototype.cancel = function(event) {
                event.preventDefault();
                if (this.formModified()) {
                    if (!confirm(gettext('Your post will be discarded.'))) {  // eslint-disable-line no-alert
                        return;
                    }
                }
                this.trigger('newPost:cancel');
                this.resetForm();
            };

            NewPostView.prototype.resetForm = function() {
                var $general;
                this.$('.forum-new-post-form')[0].reset();
                DiscussionUtil.clearFormErrors(this.$('.post-errors'));
                this.$('.wmd-preview p').html('');
                if (this.isTabMode()) {
                    $general = this.$('.post-topic option:contains(General)');
                    this.topicView.setTopic($general || this.$('button.topic-title').first());
                }
            };

            NewPostView.prototype.updateStyles = function() {
                var self = this;
                return setTimeout(function() { return self.$('.post-option-input').trigger('change'); }, 1);
            };

            return NewPostView;
        })(Backbone.View);
    }
}).call(window);
