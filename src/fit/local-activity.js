//
// Local Activity Encoder
//

import { first, last, empty, expect, } from '../functions.js';
import { profiles } from './profiles/profiles.js';
import productMessageDefinitions from './profiles/product-message-definitions.js';
import { CRC } from './crc.js';
import { fileHeader } from './file-header.js';
import { definitionRecord } from './definition-record.js';
import { dataRecord } from './data-record.js';
import { type } from './common.js';
import { FITjs } from './fitjs.js';
import { EventType } from '../activity/enums.js';

import { Encoder, Profile, Utils } from '@garmin/fitsdk';

function LocalActivity(args = {}) {
    const definitions = productMessageDefinitions
          .reduce(function(acc, x) {
              const d = definitionRecord.toFITjs(x);
              acc[d.name] = d;
              return acc;
          }, {});

    /*
    // [FITjs] -> {fileSize: Int, dataSize: Int}
    function getSize(fitjs) {
        // byteLength of the whole file start to end
        // this is needed for the DataView size
        const fileSize = fitjs.reduce(
            (acc, x) => acc += (x?.length ?? 0), 0
        );

        // byteLength of the file minus the File Header and the CRC
        // this is needed for the dataSize field in the file header
        const header = first(fitjs);
        const dataSize = fileSize - (header.length + CRC.size);

        return {
            fileSize,
            dataSize,
        };
    }
    */

    // {records: [Record], events: [Event]} -> Int
    function calcTotalTimerTime(args) {
        const records = args.records ?? [];
        const events = args.events ?? [];

        // fallbacks
        if(empty(events)) {
            if(records.length > 1) {
                // if no events are recorded fallback to first and last record
                return type.timestamp.elapsed(
                    first(records)?.timestamp,
                    last(records)?.timestamp,
                );
            } else {
                // if no events are recorded and no more than one record return 0
                console.warn(`fit: calcTotalTimerTime: 'not enough records'`);
                return 0;
            }
        }

        // sum the difference between start and stop event pairs
        return events.reduce(function(acc, event, i) {
            if(event.type === EventType.stop) {
                const startEvent = events[i-1] ?? undefined;
                if(startEvent?.type === EventType.start) {
                    // all good
                    acc += type.timestamp.elapsed(
                        startEvent?.timestamp, event?.timestamp,
                    );
                } else {
                    // we are at a stop event, but the prev event is not start
                    console.warn(`fit: calcTotalTimerTime: 'invalid event order'`);
                }
                return acc;
            }
            return acc;
        }, 0);
    }

    // {records: [Record], laps: [Lap], events: [Event], } -> Int
    function calcTotalElapsedTime(args) {
        const records = args.records ?? [];
        const laps = args.laps ?? [];
        const events = args.events ?? [];

        if(records.length < 2) {
            console.warn(`fit: calcTotalElapsedTime: 'not enough records'`);
            return 0;
        }

        const start_time = first(events)?.timestamp ?? first(records)?.timestamp;
        const timestamp = last(laps)?.timestamp ?? last(records)?.timestamp;

        return type.timestamp.elapsed(start_time, timestamp);
    }

    // Lap -> Int
    function calcLapTotalTimerTime(lap, events) {
        const _lap = expect(lap, `calcLapTotalTimerTime needs lap: Lap.`);
        const _events = events ?? [];

        const pausedTime = _events.reduce(function(acc, event, i) {
            if(event.timestamp >= _lap.start_time &&
               event.timestamp <= _lap.timestamp &&
               event.type === EventType.stop) {
                // continue only if the event overlaps with the lap
                const startEvent = _events[i+1] ?? {timestamp: _lap.timestamp};
                const stopEvent = event;

                let startTime = stopEvent.timestamp;
                let endTime = startEvent.timestamp;

                if(endTime > _lap.timestamp) {
                    // clamp to lap start and end times
                    endTime = _lap.timestamp;
                }

                acc += type.timestamp.elapsed(startTime, endTime);
            }

            return acc;
        }, 0);

        const elapsedTime = calcLapTotalElapsedTime(lap);

        return elapsedTime - Math.max(0, Math.min(pausedTime, elapsedTime));
    }

    // Lap -> Int
    function calcLapTotalElapsedTime(lap) {
        return type.timestamp.elapsed(lap.start_time, lap.timestamp);
    }

    // {records: [Record], total_timer_time: Int}
    // ->
    // Stats
    function calcStats(args = {}) {
        const records = expect(
            args.records,
            `fit: calcStats: needs records: []`
        );
        const total_timer_time = expect(
            args.total_timer_time,
            `fit: calcStats: needs total_timer_tim: Int`
        );

        const defaultStats = {
            avg_power: 0,
            avg_cadence: 0,
            avg_speed: 0,
            avg_heart_rate: 0,
            max_power: 0,
            max_cadence: 0,
            max_speed: 0,
            max_heart_rate: 0,
            total_distance: last(records)?.distance ?? 0,
            total_calories: 0,
        };

        const stats = records.reduce(function(acc, record, _, { length }) {
            acc.avg_power      += record.power / length;
            acc.avg_cadence    += record.cadence / length;
            acc.avg_speed      += record.speed / length;
            acc.avg_heart_rate += record.heart_rate / length;
            if(record.power      > acc.max_power)      acc.max_power      = record.power;
            if(record.cadence    > acc.max_cadence)    acc.max_cadence    = record.cadence;
            if(record.speed      > acc.max_speed)      acc.max_speed      = record.speed;
            if(record.heart_rate > acc.max_heart_rate) acc.max_heart_rate = record.heart_rate;
            return acc;
        }, defaultStats);

        stats.total_calories = Math.floor(stats.avg_power * total_timer_time / 1000);
        stats.avg_power = Math.floor(stats.avg_power);
        stats.avg_cadence = Math.floor(stats.avg_cadence);
        stats.avg_heart_rate = Math.floor(stats.avg_heart_rate);

        return stats;
    }

    // {records: [{<field>: Any}], laps: [{<field>: Any}]}
    // ->
    // [FITjs]
    /*
    function toFITjs(args = {}) {
        const records = args.records ?? [];
        const laps = args.laps ?? [];
        const events = args.events ?? [];

        const activity_start_time = first(events)?.start_time ?? first(records).timestamp;
        const time_created = last(laps)?.timestamp ?? last(records)?.timestamp;
        const timestamp    = time_created;
        const total_elapsed_time = calcTotalElapsedTime({records, laps, events});
        const total_timer_time = calcTotalTimerTime({records, events});
        const stats = calcStats({records, total_timer_time});

        // structure: FITjs
        const structure = [
            // file header
            FileHeader(),

            // definition file_id
            definitions.file_id,
            // data file_id
            dataRecord.toFITjs(
                definitions.file_id,
                FileId({
                    time_created,
                    manufacturer:  1,    // garmin
                    product:       3570, // edge 1030
                    serial_number: 3313379353,
                })
            ),

            // definition file_creator
            definitions.file_creator,
            // data file_creator
            dataRecord.toFITjs(
                definitions.file_creator,
                FileCreator({
                    software_version: 29, // edge 1030
                })
            ),

            // definition record
            definitions.record,
            // data record messages
            ...records.map((record) => dataRecord.toFITjs(
                definitions.record, record
            )),

            // definition events
            definitions.event,
            // data event messages
            ...events.map((event) =>
                dataRecord.toFITjs(
                    definitions.event,
                    Event(event)
                )
            ),

            // definition lap
            definitions.lap,
            // data lap messages
            ...laps.map((lap, message_index) =>
                dataRecord.toFITjs(
                    definitions.lap,
                    Lap({
                        total_elapsed_time: calcLapTotalElapsedTime(lap),
                        total_timer_time: calcLapTotalTimerTime(lap, events),
                        message_index,
                        ...lap,
                    })),
            ),

            // definition session
            definitions.session,
            // data session
            dataRecord.toFITjs(
                definitions.session,
                Session({
                    records,
                    laps,
                    events,
                    definition: definitions.session,
                    start_time: activity_start_time,
                    timestamp,
                    total_elapsed_time,
                    total_timer_time,
                    stats,
                })
            ),

            // definition activity
            definitions.activity,
            // data activity
            dataRecord.toFITjs(
                definitions.activity,
                Activity({
                    timestamp,
                    activity_start_time,
                    total_elapsed_time,
                    total_timer_time,
                })
            ),
            // crc, needs to be computed last evetytime when encoding to binary
            CRC.toFITjs(),
        ];

        const header = first(structure);
        header.dataSize = getSize(structure).dataSize;

        return structure;
    }
    */

    // {records: [{<field>: Any}], laps: [{<field>: Any}]}
    // ->
    // [FITjs]
    function toFITjsStandard(args = {}) {
        const records = args.records ?? [];
        const laps = args.laps ?? [];
        const events = args.events ?? [];
        const hrvs = args.hrvs ?? [];

        const activity_start_time = first(events)?.start_time ?? first(records).timestamp;
        const time_created = last(laps)?.timestamp ?? last(records)?.timestamp;
        const startTime = Utils.convertDateToDateTime(new Date(time_created));
        const timestamp    = time_created;
        const total_elapsed_time = calcTotalElapsedTime({records, laps, events});
        const total_timer_time = calcTotalTimerTime({records, events});
        const stats = calcStats({records, total_timer_time});

        // structure: FITjs
        const structure = [
            // file_id
            {
                mesgNum: Profile.MesgNum.FILE_ID,
                timeCreated: startTime,
                type: "activity",
                manufacturer:  "garmin",    // garmin
                product:       3570,        // edge 1030
                serial_number: 3313379353,

            },
            // file_creator
            {
                mesgNum: Profile.MesgNum.FILE_CREATOR,
                softwareVersion: 29, // edge 1030
            },
            // records
            ...records.flatMap(record => RecordStandard({ ...record, hrvs })),
            // events
            ...events.map(event => EventStandard(event)),
            // laps
            ...laps.map((lap, message_index) => LapStandard({
                total_elapsed_time: calcLapTotalElapsedTime(lap),
                total_timer_time: calcLapTotalTimerTime(lap, events),
                message_index,
                ...lap,
            })),
            // session
            SessionStandard({
                records,
                laps,
                events,
                start_time: activity_start_time,
                timestamp,
                total_elapsed_time,
                total_timer_time,
                stats,
            }),
            // Activity
            ActivityStandard({
                timestamp,
                activity_start_time,
                total_elapsed_time,
                total_timer_time,
            })
        ];

        return structure;
    }
    

    // {records: [{<field>: Any}], laps: [{<field>: Any}]}
    // -> Dataview
    function encode(args = {}) {
        const fitjsStandard = toFITjsStandard(args);
        const encoder = new Encoder();
        fitjsStandard.forEach((mesg) => {
            encoder.writeMesg(mesg);
        });
        return encoder.close()
        /*
        const fitjs = toFITjs(args);
        return FITjs.encode(fitjs);
        */
    }

    return Object.freeze({
        //toFITjs,
        toFITjsStandard,
        encode,
    });
}

// Special Data Messages
/*function FileHeader() {
    return fileHeader.toFITjs();
}

function FileId(args = {}) {
    return {
        time_created: args.time_created ?? Date.now(),
        manufacturer: args.manufacturer ?? 255,
        product: args.product ?? 0,
	      serial_number: args.serial_number ?? 0,
        number: 0,
        type: 4,
    };
}

function FileCreator(args = {}) {
    return {
        software_version: args.software_version ?? 0,
    };
}

function Event(args = {}) {
    return {
        timestamp: expect(args.timestamp, 'Event needs timestamp.'),
        event: profiles?.types?.event_type?.values['timer'] ?? 0,
        event_type: profiles?.types?.event_type?.values[args.type] ?? 0,
        event_group: 0,
    };
}

function Lap(args = {}) {
    return {
        
        timestamp: expect(args.timestamp, 'Lap needs timestamp.'),
        start_time: expect(args.start_time, 'Lap needs start_time.'),
        total_elapsed_time: expect(args.total_elapsed_time, 'Lap needs total_elapsed_time.'),
        total_timer_time: expect(args.total_timer_time, 'Lap needs total_timer_time'),
        message_index: args.message_index ?? 0,
        event: profiles.types?.event?.values?.lap ?? 9,
        event_type: profiles.types?.event_type?.values?.stop ?? 1,
    };
}

function Activity(args = {}) {
    return {
        timestamp: expect(args.timestamp, 'Activity needs timestamp.'),
        total_timer_time: expect(args.total_timer_time, 'Activity needs total_timer_time'),
        num_sessions: 1,
        type: profiles.types.activity.values.manual,
        event: profiles.types.event.values.activity,
        event_type: profiles.types.event_type.values.stop,
        // local_timestamp: args.timestamp,
    };
}

function Session(args = {}) {
    return {
        timestamp: expect(args.timestamp, 'Session needs timestamp.'),
        start_time: expect(args.start_time, 'Session needs start_time.'),
        total_elapsed_time: expect(
            args.total_elapsed_time,
            'Session needs total_elapsed_time.'
        ),
        total_timer_time: expect(
            args.total_timer_time,
            'Session needs total_timer_time'
        ),
        message_index:      args.message_index,
        sport:              profiles.types.sport.values.cycling,
        sub_sport:          profiles.types.sub_sport.values.virtual_activity,
        ...args.stats,
        first_lap_index:    0,
        num_laps:           args.num_laps,
    };
}*/

function EventStandard(args = {}) {
    return {
        mesgNum: Profile.MesgNum.EVENT,
        timestamp: Utils.convertDateToDateTime(new Date(expect(args.timestamp, 'Event needs timestamp.'))),
        event: profiles?.types?.event_type?.values['timer'] ?? 0,
        eventType: profiles?.types?.event_type?.values[args.type] ?? 0,
        eventGroup: 0,
    };
}

function LapStandard(args = {}) {
    return {
        mesgNum: Profile.MesgNum.LAP,
        timestamp: Utils.convertDateToDateTime(new Date(expect(args.timestamp, 'Lap needs timestamp.'))),
        startTime: Utils.convertDateToDateTime(new Date(expect(args.start_time, 'Lap needs start_time.'))),
        totalElapsedTime: expect(args.total_elapsed_time, 'Lap needs total_elapsed_time.'),
        totalTimerTime: expect(args.total_timer_time, 'Lap needs total_timer_time'),
        messageIndex: args.message_index ?? 0,
        event: profiles.types?.event?.values?.lap ?? 9,
        eventType: profiles.types?.event_type?.values?.stop ?? 1,
    };
}

function ActivityStandard(args = {}) {
    return {
        mesgNum: Profile.MesgNum.ACTIVITY,
        timestamp: Utils.convertDateToDateTime(new Date(expect(args.timestamp, 'Activity needs timestamp.'))),
        totalTimerTime: expect(args.total_timer_time, 'Activity needs total_timer_time'),
        numSessions: 1,
        type: profiles.types.activity.values.manual,
        event: profiles.types.event.values.activity,
        eventType: profiles.types.event_type.values.stop,
        // localTimestamp: args.timestamp,
    };
}

function SessionStandard(args = {}) {
    return {
        mesgNum: Profile.MesgNum.SESSION,
        timestamp: Utils.convertDateToDateTime(new Date(expect(args.timestamp, 'Session needs timestamp.'))),
        startTime: Utils.convertDateToDateTime(new Date(expect(args.start_time, 'Session needs start_time.'))),
        totalElapsedTime: expect(args.total_elapsed_time, 'Session needs total_elapsed_time.'),
        totalTimerTime: expect(args.total_timer_time, 'Session needs total_timer_time'),
        messageIndex: args.message_index,
        sport: profiles.types.sport.values.cycling,
        subSport: profiles.types.sub_sport.values.virtual_activity,
        ...args.stats,
        firstLapIndex: 0,
        numLaps: args.num_laps,
    };
}

function RecordStandard(args = {}) {
    const record = {
        mesgNum: Profile.MesgNum.RECORD,
        timestamp: Utils.convertDateToDateTime(new Date(expect(args.timestamp, 'Record needs timestamp.'))),
        ...(args.position_lat && { positionLat : position_lat }),
        ...(args.position_long && { positionLat : position_long }),
        heartRate: args.heart_rate,
        cadence: args.cadence,
        power: args.power,
        distance: args.distance,
        grade: args.grade,
        totalHemoglobinConc: args.total_hemoglobin_conc,
        saturatedHemoglobinPercent: args.saturated_hemoglobin_percent,
        deviceIndex: args.device_index,
        enhancedSpeed: args.enhanced_speed,
        enhancedAltitude: args.enhanced_altitude,
        coreTemperature: args.core_temperature,
        skinTemperature: args.skin_temperature,
    };
    const hrv = args.hrvs.find((hrv) => hrv.timestamp == args.timestamp);
    if (hrv && hrv.time && hrv.time.length > 0) {
        const hrvTime = [...hrv.time].map(hrv => hrv / 1000 );
        //const hrvFit = [...hrv.time]
        for(let i = hrvTime.length; i < 5; i++ ) {
            hrvTime.push(null);
        }
       /*for(let i = hrvFit.length; i < 5; i++ ) {
        
        }*/
       const hrvRecord = {
              mesgNum: Profile.MesgNum.HRV,
              time: hrvTime,
       }
       return [ record, hrvRecord];
       
    } else {
        return [ record ]
    }
}
// END Special Data Messages

const localActivity = LocalActivity();

export {
    localActivity,
    //FileId,
    //Event,
    //Lap,
    //Session,
    //Activity,

    EventStandard,
    LapStandard,
    SessionStandard,
    ActivityStandard,
};

