export interface Ashrae622LocalExhaust {
  kitchenIntermittent: number; // cfm
  kitchenContinuousACH: number; // ACH
  bathroomIntermittent: number; // cfm
  bathroomContinuous: number; // cfm
  toiletRoomIntermittent: number | null; // cfm (null if not explicitly required by edition)
  toiletRoomContinuous: number | null; // cfm
}

export const ASHRAE_62_2_DATA: Record<'2019' | '2022' | '2025', Ashrae622LocalExhaust> = {
  '2019': {
    kitchenIntermittent: 100,
    kitchenContinuousACH: 5,
    bathroomIntermittent: 50,
    bathroomContinuous: 20,
    toiletRoomIntermittent: null, // Toilet rooms were just considered bathrooms if they had a bathing fixture, or just not explicitly separated like 2025
    toiletRoomContinuous: null
  },
  '2022': {
    kitchenIntermittent: 100,
    kitchenContinuousACH: 5,
    bathroomIntermittent: 50,
    bathroomContinuous: 20,
    toiletRoomIntermittent: null,
    toiletRoomContinuous: null
  },
  // [DISABLED / FUTURE - NOT FOR ACTIVE PRODUCTION CALCULATION]
  '2025': {
    kitchenIntermittent: 100,
    kitchenContinuousACH: 5,
    bathroomIntermittent: 50,
    bathroomContinuous: 20,
    toiletRoomIntermittent: 50, // 62.2-2025 explicitly includes "Toilet Rooms" (without bathtub/shower) at 50 cfm int / 20 cfm cont
    toiletRoomContinuous: 20
  }
};
