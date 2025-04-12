import { test, expect, request, APIRequestContext } from "@playwright/test";
import { Console } from "console";

const localEnvURL = "localhost:1234";
const satelliteConfigurationsEndpoint = "configs";
const cosparIdValidFormat = /^\d{4}-\d{3}[A-Z]{2}$/;

interface APIError {
  message: string;
  source: string;
}

interface SatelliteConfig {
  id: number;
  name: string;
  type: "OPTICAL" | "SAR";
  cospar_id: string;
}

interface ConfigResponse {
  meta: null;
  data: SatelliteConfig[] | null;
  errors: APIError[] | null;
}

async function getAllExistingSatelliteConfigurations(request) {
  const response = await request.get(
    `http://${localEnvURL}/${satelliteConfigurationsEndpoint}`
  );
  const body: ConfigResponse = await response.json();
  const data = body.data;
  return { response, body, data };
}

async function getAllExistingSatelliteConfigurationIds(request) {
  const { data } = await getAllExistingSatelliteConfigurations(request);
  const ids = Array.isArray(data) ? data.map((config) => config.id) : [];
  return ids;
}

async function deleteAllExistingSatelliteConfigurations(request) {
  // Delete all existing configurations
  const ids = await getAllExistingSatelliteConfigurationIds(request);
  ids.forEach(async (id) => {
    await request.delete(
      `http://${localEnvURL}/${satelliteConfigurationsEndpoint}/${id}`
    );
  });

  // Validate there are no configurations left
  const { body } = await getAllExistingSatelliteConfigurations(request);

  expect(body.meta).toBeNull();
  expect(body.errors).toBeNull();
  expect(body.data).toEqual([]);
}

async function createMultipleSatelliteConfigurations(request, configsPayload) {
  for (const config of configsPayload) {
    const response = await request.post(
      `http://${localEnvURL}/${satelliteConfigurationsEndpoint}`,
      { data: config }
    );
  }
}

async function createSingleSatelliteConfiguration(request, configPayload) {
  const response = await request.post(
    `http://${localEnvURL}/${satelliteConfigurationsEndpoint}`,
    { data: configPayload }
  );
  const body: ConfigResponse = await response.json();
  const data = body.data;
  return { response, body, data };
}

async function updateSingleSatelliteConfig(request, configPayload, configId) {
  const response = await request.put(
    `http://${localEnvURL}/${satelliteConfigurationsEndpoint}/${configId}`,
    { data: configPayload }
  );
  const body: ConfigResponse = await response.json();
  const data = body.data;
  return { response, body, data };
}

test.beforeEach(async ({ request }) => {
  await deleteAllExistingSatelliteConfigurations(request);
});

test.describe("GET /configs", () => {
  test("Get All Satellite Configurations", async ({ request }) => {
    const { response, body, data } =
      await getAllExistingSatelliteConfigurations(request);

    // Validate Status Code
    expect(response.status()).toBe(200);

    // Validate meta and error fields are null
    expect(body.meta).toBeNull();
    expect(body.errors).toBeNull();

    // Validate data is an array
    expect(Array.isArray(data)).toBe(true);

    // Data validations

    // Only numeric IDs
    const ids = data!.map((config) => config.id);
    ids.forEach((id) => {
      expect(typeof id).toBe("number");
    });
    // No repetated IDs
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);

    // TODO: VALIDATE REQUIREMENT
    const validTypes: Array<SatelliteConfig["type"]> = ["OPTICAL", "SAR"];

    data!.forEach((config) => {
      // Valid Satellite Type
      expect(validTypes).toContain(config.type);
      // Valid Cospar ID Format
      expect(config.cospar_id).toMatch(cosparIdValidFormat);
    });
  });
});

test.describe("GET /configs/:missionID", () => {
  // Start each test with only one Satellite Config
  test.beforeEach(async ({ request }) => {

    const payloadSatelliteConfig = {
      name: "Dummy Valid Satellite",
      type: "OPTICAL",
      cospar_id: "2023-001AB",
    }

    await createSingleSatelliteConfiguration(
      request,
      payloadSatelliteConfig
    );
  })
  test("Get Satellite Configuration by Existing Mission ID", async ({ request }) => {
    const validSatelliteConfigId = 1
    const expectedSatelliteConfigData = {
      id: 1,
      name: "Dummy Valid Satellite",
      type: "OPTICAL",
      cospar_id: "2023-001AB",
    }
    const response = await request.get(
      `http://${localEnvURL}/${satelliteConfigurationsEndpoint}/${validSatelliteConfigId}`
    );
    const body: ConfigResponse = await response.json();
    const data = body.data;

    expect(response.status()).toBe(200);
    expect(body.meta).toBeNull()
    expect(body.errors).toBeNull()
    expect(data).toEqual(expectedSatelliteConfigData);
  });
  test("Get Satellite Configuration by Non-Existing Mission ID", async ({ request }) => {
    const invalidSatelliteConfigId = 2
    const response = await request.get(
      `http://${localEnvURL}/${satelliteConfigurationsEndpoint}/${invalidSatelliteConfigId}`
    );
    const body: ConfigResponse = await response.json();
    const data = body.data;

    expect(response.status()).toBe(404);
    expect(body.meta).toBeNull()
    expect(body.data).toBeNull()
    expect(body.errors[0].message).toEqual(`'resource '${invalidSatelliteConfigId}' of type 'Mission'' does not exist`)
  });

});


test.describe("PUT /configs/:missionID", () => {
  test.beforeEach(async ({ request }) => {

    const payloadSatelliteConfig = {
      name: "Dummy Valid Satellite",
      type: "OPTICAL",
      cospar_id: "2023-001AB",
    }

    await createSingleSatelliteConfiguration(
      request,
      payloadSatelliteConfig
    );
  })
  test("Update Existing Satellite Configuration", async ({ request }) => {
    const existingSatelliteConfigId = 1
    const payloadSatelliteConfig = {
      name: "Dummy Valid Satellite Updated",
      type: "SAR",
      cospar_id: "2024-002BC",
    };

    const expectedSatelliteConfigsData = [
      {
        id: 1,
        name: "Dummy Valid Satellite Updated",
        type: "SAR",
        cospar_id: "2024-002BC",
      },
    ];

    const { response, body } = await updateSingleSatelliteConfig(request, payloadSatelliteConfig, existingSatelliteConfigId)

    // TODO: VALIDATE REQUIREMENT
    expect(response.status()).toBe(200)

    expect(body.errors).toBeNull()
    expect(body.meta).toBeNull()
    expect(body.data.message).toEqual("Mission config updated successfully")

    const { data: actualSatelliteConfigData } =
      await getAllExistingSatelliteConfigurations(request);

    expect(actualSatelliteConfigData).toEqual(expectedSatelliteConfigsData);

  });

  test("Update Non-Existing Satellite Configuration", async ({
    request,
  }) => {
    const nonExistingSatelliteConfigId = 2
    const payloadSatelliteConfig = {
      name: "Dummy Valid Satellite Updated",
      type: "SAR",
      cospar_id: "2024-002BC",
    };

    const { response, body } = await updateSingleSatelliteConfig(request, payloadSatelliteConfig, nonExistingSatelliteConfigId)

    expect(response.status()).toBe(404)

    expect(body.data).toBeNull()
    expect(body.meta).toBeNull()
    expect(body.errors[0].message).toEqual(`'resource '${nonExistingSatelliteConfigId}' of type 'Mission'' does not exist`)

  });
  test("Update Satellite Configuration without All Required Fields", async ({
    request,
  }) => { });
  test("Update Satellite Configuration with Invalid Data", async ({
    request,
  }) => { });

});

test.describe("POST /configs", () => {
  test("Create Single Valid Satellite Configuration", async ({ request }) => {
    const successfullConfigCreationMessage =
      "Mission config created successfully";
    const payloadSatelliteConfig = {
      name: "Test Satellites 322",
      type: "OPTICAL",
      cospar_id: "2023-001AB",
    };

    const expectedSatelliteConfigsData = [
      {
        id: 1,
        name: "Test Satellites 322",
        type: "OPTICAL",
        cospar_id: "2023-001AB",
      },
    ];

    const { response, data } = await createSingleSatelliteConfiguration(
      request,
      payloadSatelliteConfig
    );

    // VALIDATE REQUIREMENT
    expect(response.status()).toBe(200);
    expect(data.message).toEqual(successfullConfigCreationMessage);

    const { data: actualSatelliteConfigData } =
      await getAllExistingSatelliteConfigurations(request);

    expect(actualSatelliteConfigData).toEqual(expectedSatelliteConfigsData);
  }),
    test("Create Multiple Valid Satellite Configuration", async ({
      request,
    }) => {
      const payloadSatelliteConfigs = [
        {
          name: "Test Satellites 322",
          type: "OPTICAL",
          cospar_id: "2023-001AB",
        },
        { name: "Test Satellites 3643", type: "SAR", cospar_id: "2056-231ZX" },
      ];

      // Improve data handling to avoid repetition
      const expectedSatelliteConfigsData = [
        {
          id: 1,
          name: "Test Satellites 322",
          type: "OPTICAL",
          cospar_id: "2023-001AB",
        },
        {
          id: 2,
          name: "Test Satellites 3643",
          type: "SAR",
          cospar_id: "2056-231ZX",
        },
      ];

      await createMultipleSatelliteConfigurations(request, payloadSatelliteConfigs);
      const { data } = await getAllExistingSatelliteConfigurations(request);

      expect(data).toEqual(expectedSatelliteConfigsData);
    });

  test("Create Satellite Configuration with Invalid Field Name", async ({
    request,
  }) => {
  }),

    test("Create Satellite Configuration without Required Fields", async ({
      request,
    }) => {
      const payloadSatelliteConfigWithoutName =
      {
        type: "OPTICAL",
        cospar_id: "2023-001AB",
      }
      const payloadSatelliteConfigWithoutType =
      {
        name: "Test Satellites 322",
        cospar_id: "2023-001AB",
      }
      const payloadSatelliteConfigWithoutCosparId =
      {
        name: "Test Satellites 322",
        type: "OPTICAL",
      }
      const { response: responseWithoutName, body: bodyWithoutName } = await createSingleSatelliteConfiguration(
        request,
        payloadSatelliteConfigWithoutName
      )
      expect(responseWithoutName.status()).toBe(400)
      expect(bodyWithoutName.data).toBeNull()
      expect(bodyWithoutName.meta).toBeNull()
      expect(bodyWithoutName.errors![0].message).toEqual("invalid request due to name is required")

      const { response: responseWithoutType, body: bodyWithoutType } = await createSingleSatelliteConfiguration(
        request,
        payloadSatelliteConfigWithoutType
      )
      expect(responseWithoutType.status()).toBe(400)
      expect(bodyWithoutType.data).toBeNull()
      expect(bodyWithoutType.meta).toBeNull()
      expect(bodyWithoutType.errors![0].message).toEqual("invalid request due to payload type is required")

      const { response: responseWithoutCosparId, body: bodyWithoutCosparId } = await createSingleSatelliteConfiguration(
        request,
        payloadSatelliteConfigWithoutCosparId
      )
      expect(responseWithoutCosparId.status()).toBe(400)
      expect(bodyWithoutCosparId.data).toBeNull()
      expect(bodyWithoutCosparId.meta).toBeNull()
      expect(bodyWithoutCosparId.errors![0].message).toEqual("invalid request due to cospar ID is required")
    }),

    test("Create Satellite Configuration with Invalid Data", async ({
      request,
    }) => {
      const payloadSatelliteConfigWithInvalidType =
      {
        name: "New Satellite Mission",
        type: "INVALID TYPE",
        cospar_id: "2000-999AB",
      }

      const { response: responseWithInvalidType, body: bodyWithInvalidType } = await createSingleSatelliteConfiguration(
        request,
        payloadSatelliteConfigWithInvalidType
      )
      expect(responseWithInvalidType.status()).toBe(400)
      expect(bodyWithInvalidType.data).toBeNull()
      expect(bodyWithInvalidType.meta).toBeNull()
      expect(bodyWithInvalidType.errors![0].message).toEqual("invalid request due to invalid payload type")

      const payloadSatelliteConfigWithInvalidCosparId =
      {
        name: "New Satellite Mission",
        type: "OPTICAL",
        cospar_id: "2000-999ABC",
      }

      const { response: responseWithInvalidCosparId, body: bodyWithInvalidCosparId } = await createSingleSatelliteConfiguration(
        request,
        payloadSatelliteConfigWithInvalidCosparId
      )
      expect(responseWithInvalidCosparId.status()).toBe(400)
      expect(bodyWithInvalidCosparId.data).toBeNull()
      expect(bodyWithInvalidCosparId.meta).toBeNull()
      expect(bodyWithInvalidCosparId.errors![0].message).toEqual("invalid request due to invalid COSPAR ID")
    })

}),




  test.describe("DELETE /configs/:missionID", () => {
    // Start each test with only one Satellite Config
    test.beforeEach(async ({ request }) => {

      const payloadSatelliteConfig = {
        name: "Dummy Valid Satellite",
        type: "OPTICAL",
        cospar_id: "2023-001AB",
      }

      await createSingleSatelliteConfiguration(
        request,
        payloadSatelliteConfig
      );
    })
    test("Delete Existing Satellite Configuration", async ({ request }) => {
      const existingSatelliteConfigId = 1
      const response = await request.delete(
        `http://${localEnvURL}/${satelliteConfigurationsEndpoint}/${existingSatelliteConfigId}`
      );
      const body: ConfigResponse = await response.json();
      const data = body.data;

      expect(response.status()).toBe(200);
      expect(body.meta).toBeNull()
      expect(body.errors).toBeNull()
      expect(data.message).toEqual("Mission config deleted successfully");

    });

    test("Delete Non-Existing Satellite Configuration", async ({ request }) => {
      const nonExistingSatelliteConfigId = 2
      const response = await request.delete(
        `http://${localEnvURL}/${satelliteConfigurationsEndpoint}/${nonExistingSatelliteConfigId}`
      );
      const body: ConfigResponse = await response.json();
      const data = body.data;

      expect(response.status()).toBe(404)
      expect(body.meta).toBeNull()
      expect(body.data).toBeNull()
      expect(body.errors[0].message).toEqual(`'resource '${nonExistingSatelliteConfigId}' of type 'Mission'' does not exist`);
    });
    test("Delete Satellite Configuration with Invalid Id Type", async ({ request }) => { })
  });

test.describe("Other Edge Cases", () => {
  test("Invalid Endpoint", async ({ request }) => {
    const invalidEndpoint = "configss";

    const response = await request.get(
      `http://${localEnvURL}/${invalidEndpoint}`
    );
    const body: ConfigResponse = await response.json();
    const data = body.data;

    // Validate Status Code
    expect(response.status()).toBe(404);

    // Validate meta and data fields are null
    expect(body.meta).toBeNull();
    expect(data).toBeNull();
    expect(body.errors[0].message).toEqual(`'resource '/${invalidEndpoint}' of type 'page'' does not exist`)
  });

  test("Service Limit Exceeded", async ({ request }) => {
    // TODO: VALIDATE REQUIREMENT
    const maxConfigsSupported = 6
    for (let i = 1; i <= maxConfigsSupported; i++) {
      const payloadSatelliteConfig = {
        cospar_id: `2000-${(100 + i).toString()}AA`,
        name: `Satellite Config ${i}`,
        type: "OPTICAL"
      };
      const { response, body, data } = await createSingleSatelliteConfiguration(request, payloadSatelliteConfig);
      expect(response.status()).toBe(200);
      expect(data.message).toEqual("Mission config created successfully");


    }
    const payloadSatelliteConfigExtra = {
      cospar_id: `2000-${(100 + maxConfigsSupported + 1).toString()}AA`,
      name: `Satellite Config Exceeding ${maxConfigsSupported + 1}`,
      type: "OPTICAL"
    };
    const { response: responseExceeding, body: bodyExceeding, data: dataExceeding } =
      await createSingleSatelliteConfiguration(request, payloadSatelliteConfigExtra);

    expect(responseExceeding.status()).toBe(400);
    expect(bodyExceeding.errors[0].message).toEqual("invalid request due to mission config database is full");
  });
  test("Empty Body", async ({ request }) => { });
});
