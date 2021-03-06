// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { Injectable, OnDestroy } from '@angular/core';
import { CoreUserDelegate, CoreUserProfileHandler, CoreUserProfileHandlerData } from '@core/user/providers/user-delegate';
import { CoreSitesProvider } from '@providers/sites';
import { AddonMessagesProvider } from './messages';
import { AddonMessagesBlockContactUserHandler } from './user-block-contact-handler';
import { CoreEventsProvider } from '@providers/events';
import { CoreDomUtilsProvider } from '@providers/utils/dom';
import { TranslateService } from '@ngx-translate/core';

/**
 * Profile add/remove contact handler.
 */
@Injectable()
export class AddonMessagesAddContactUserHandler implements CoreUserProfileHandler, OnDestroy {
    /**
     * Update handler information event.
     * @type {string}
     */
    static UPDATED_EVENT = 'AddonMessagesAddContactUserHandler_updated_event';

    name = 'AddonMessages:addContact';
    priority = 800;
    type = CoreUserDelegate.TYPE_ACTION;

    protected disabled = false;
    protected updateObs: any;

    constructor(protected sitesProvider: CoreSitesProvider,
            private messagesProvider: AddonMessagesProvider, protected eventsProvider: CoreEventsProvider,
            private domUtils: CoreDomUtilsProvider, private translate: TranslateService) {

        this.updateObs = eventsProvider.on(AddonMessagesBlockContactUserHandler.UPDATED_EVENT, (data) => {
            this.checkButton(data.userId);
        });
    }

    /**
     * Check if handler is enabled.
     *
     * @return {Promise<boolean>} Promise resolved with true if enabled, rejected or resolved with false otherwise.
     */
    isEnabled(): Promise<boolean> {
        return this.messagesProvider.isPluginEnabled();
    }

    /**
     * Check if handler is enabled for this user in this context.
     *
     * @param {any} user          User to check.
     * @param {number} courseId   Course ID.
     * @param  {any} [navOptions] Course navigation options for current user. See CoreCoursesProvider.getUserNavigationOptions.
     * @param  {any} [admOptions] Course admin options for current user. See CoreCoursesProvider.getUserAdministrationOptions.
     * @return  {boolean|Promise<boolean>}   Promise resolved with true if enabled, resolved with false otherwise.
     */
    isEnabledForUser(user: any, courseId: number, navOptions?: any, admOptions?: any): boolean | Promise<boolean> {
        return user.id != this.sitesProvider.getCurrentSiteUserId();
    }

    /**
     * Returns the data needed to render the handler.
     *
     * @return {CoreUserProfileHandlerData} Data needed to render the handler.
     */
    getDisplayData(user: any, courseId: number): CoreUserProfileHandlerData {
        this.checkButton(user.id);

        return {
            icon: '',
            title: '',
            spinner: false,
            class: '',
            action: (event, navCtrl, user, courseId): void => {
                event.preventDefault();
                event.stopPropagation();

                if (this.disabled) {
                    return;
                }
                this.disabled = true;
                this.updateButton({spinner: true});

                this.messagesProvider.isContact(user.id).then((isContact) => {
                    if (isContact) {
                        const template = this.translate.instant('addon.messages.removecontactconfirm'),
                            title = this.translate.instant('addon.messages.removecontact');

                        return this.domUtils.showConfirm(template, title, title).then(() => {
                            return this.messagesProvider.removeContact(user.id);
                        });
                    } else {
                        return this.messagesProvider.addContact(user.id);
                    }
                }).catch((error) => {
                    this.domUtils.showErrorModalDefault(error, 'core.error', true);
                }).finally(() => {
                    this.eventsProvider.trigger(AddonMessagesAddContactUserHandler.UPDATED_EVENT, {userId: user.id});
                    this.checkButton(user.id).finally(() => {
                        this.disabled = false;
                    });
                });

            }
        };
    }

    /**
     * Update Button with avalaible data.
     * @param {number} userId User Id to update.
     * @return {Promise<void>}   Promise resolved when done.
     */
    protected checkButton(userId: number): Promise<void> {
        this.updateButton({spinner: true});

        return this.messagesProvider.isContact(userId).then((isContact) => {
            if (isContact) {
                this.updateButton({
                    title: 'addon.messages.removecontact',
                    class: 'addon-messages-removecontact-handler',
                    icon: 'remove',
                    hidden: false,
                    spinner: false
                });
            } else {
                this.updateButton({
                    title: 'addon.messages.addcontact',
                    class: 'addon-messages-addcontact-handler',
                    icon: 'add',
                    hidden: false,
                    spinner: false
                });
            }
        }).catch(() => {
            // This fails for some reason, let's just hide the button.
            this.updateButton({hidden: true});
        });
    }

    /**
     * Triggers the event to update the handler information.
     * @param {any} data Data that should be updated.
     */
    protected updateButton(data: any): void {
        // This fails for some reason, let's just hide the button.
        this.eventsProvider.trigger(CoreUserDelegate.UPDATE_HANDLER_EVENT, { handler: this.name, data: data });
    }

    /**
     * Destroyed method.
     */
    ngOnDestroy(): void {
        this.updateObs && this.updateObs.off();
    }
}
