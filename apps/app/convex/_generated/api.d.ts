/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bodyEntries from "../bodyEntries.js";
import type * as checkins from "../checkins.js";
import type * as crons from "../crons.js";
import type * as exercises from "../exercises.js";
import type * as exercisesSeed from "../exercisesSeed.js";
import type * as http from "../http.js";
import type * as model from "../model.js";
import type * as notifications from "../notifications.js";
import type * as push from "../push.js";
import type * as pushSender from "../pushSender.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bodyEntries: typeof bodyEntries;
  checkins: typeof checkins;
  crons: typeof crons;
  exercises: typeof exercises;
  exercisesSeed: typeof exercisesSeed;
  http: typeof http;
  model: typeof model;
  notifications: typeof notifications;
  push: typeof push;
  pushSender: typeof pushSender;
  templates: typeof templates;
  users: typeof users;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
