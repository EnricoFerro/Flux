import { xf, formatDate, } from '../functions.js';
import { models } from '../models/models.js';
import { formatTime, } from '../utils.js';

class ActivityList extends HTMLElement {
    constructor() {
        super();
        this.capacity = 3;
        this.index = 0;
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        xf.sub('activity:add', self.onAdd.bind(this), this.signal);
        xf.sub('db:activity', self.onRestore.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
        this.unsubs();
    }
    onAdd(activity) {
        const self = this;
        self.insertAdjacentHTML("afterbegin", self.template(this.index, activity));

        if(this.childElementCount > 3) {
            self.removeChild(self.lastElementChild);
        }

        this.index++;
    }
    onRestore(activities) {
        const self = this;
        activities.forEach((a) => {
            self.insertAdjacentHTML("beforeend", self.template(this.index, a));
        });
    }
    id(data) {
        return data.id;
    }
    date(data) {
        return formatDate({date: new Date(data.timestamp)});
    }
    duration(data) {
        return formatTime({value: data.duration});
    }
    uploadStatus(data) {
        return data.status;
    }
    template(i, data) {
        const status = this.uploadStatus(data);

        return `
            <activity-item id="i${i}--activity--item" class="some" data-id="${this.id(data)}">
                <div class="list--row--outer">
                    <div class="list--row--inner activity--cont">
                        <div id="i${i}--activity--date" class="activity--date">
                            ${this.date(data)}
                        </div>
                        <div id="i${i}--activity--duration" class="activity--duration">
                            ${this.duration(data)}
                        </div>
                        <view-action
                            class="activity--action"
                            action=":download"
                            topic=":activity:${this.id(data)}">
                            <svg class="activity--icon">
                                <use href="#icon--save-btn" />
                            </svg>
                        </view-action>
                        <view-action
                            class="activity--action"
                            action=":strava:upload"
                            topic=":activity:${this.id(data)}">
                            <svg class="activity--icon strava--icon">
                                <use href="#icon--strava" />
                            </svg>
                            <div class="connection-icon-switch--indicator ${status.strava ?? 'none'} strava"></div>
                        </view-action>
                        <view-action
                            class="activity--action"
                            action=":intervals:upload"
                            topic=":activity:${this.id(data)}">
                            <svg class="activity--icon intervals--icon">
                                <use href="#icon--intervals" />
                            </svg>
                            <div class="connection-icon-switch--indicator ${status.intervals ?? 'none'} intervals"></div>
                        </view-action>

                        <view-action
                            class="activity--action"
                            action=":tp:upload"
                            topic=":activity:${this.id(data)}">
                            <div class="tp-logo--icon">TP</div>
                            <div class="connection-icon-switch--indicator ${status.tp ?? 'none'} tp"></div>
                        </view-action>

                    </div>
                </div>
            </activity-item>
        `;
    }
}

customElements.define('activity-list', ActivityList);

class ActivityItem extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        const self = this;
        this.abortController = new AbortController();
        this.signal = { signal: self.abortController.signal };

        this.$indicatorStrava = this.querySelector(`.connection-icon-switch--indicator.strava`);
        this.$indicatorIntervals = this.querySelector(`.connection-icon-switch--indicator.intervals`);

        this.$indicatorTP = this.querySelector(`.connection-icon-switch--indicator.tp`);
        this.id = this.dataset.id;

        xf.sub(`action:activity:${self.id}`, this.onAction.bind(this), this.signal);
    }
    disconnectedCallback() {
        this.abortController.abort();
    }
    onAction(action) {
        console.log(action, this.id);

        if(action === ':download') {
            models.activity.download(this.id);
            return;
        }
        if(action === ':strava:upload') {
            models.activity.upload('strava', this.id);
            this.onLoading(this.$indicatorStrava);
            return;
        }
        if(action === ':intervals:upload') {
            models.activity.upload('intervals', this.id);
            this.onLoading(this.$indicatorIntervals);
            return;
        }
        if(action === ':tp:upload') {
            models.activity.upload('trainingPeaks', this.id);
            this.onLoading(this.$indicatorTP);
            return;
        }

        if(action === ':strava:upload:success') {
            this.onSuccess(this.$indicatorStrava);
        }
        if(action === ':strava:upload:fail') {
            this.onFail(this.$indicatorStrava);
        }
        if(action === ':intervals:upload:success') {
            this.onSuccess(this.$indicatorIntervals);
        }
        if(action === ':intervals:upload:fail') {
            this.onFail(this.$indicatorIntervals);
        }
        if(action === ':tp:upload:success') {
            this.onSuccess(this.$indicatorTP);
        }
        if(action === ':tp:upload:fail') {
            this.onFail(this.$indicatorTP);
        }
    }
    onLoading($el) {
        $el.classList.remove('fail');
        $el.classList.remove('success');
        $el.classList.remove('none');
        $el.classList.add('loading');
    }
    onSuccess($el) {
        $el.classList.remove('off');
        $el.classList.remove('none');
        $el.classList.remove('loading');
        $el.classList.add('success');
    }
    onFail($el) {
        $el.classList.remove('success');
        $el.classList.remove('loading');
        $el.classList.remove('none');
        $el.classList.add('fail');
    }
}

customElements.define('activity-item', ActivityItem);
