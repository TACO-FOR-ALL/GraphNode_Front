import { unwrapAndMap, unwrapResponse } from "../httpResponse";

describe("httpResponse", () => {
  test("unwrapResponse returns data for successful responses", () => {
    expect(
      unwrapResponse({
        isSuccess: true,
        statusCode: 200,
        data: { value: 42 },
      }),
    ).toEqual({ value: 42 });
  });

  test("unwrapResponse throws the server message for failed responses", () => {
    expect(() =>
      unwrapResponse({
        isSuccess: false,
        error: { statusCode: 400, message: "Bad request" },
      }),
    ).toThrow("Bad request");
  });

  test("unwrapAndMap applies the mapper to successful responses", () => {
    expect(
      unwrapAndMap(
        {
          isSuccess: true,
          statusCode: 200,
          data: [{ id: "a" }, { id: "b" }],
        },
        (rows) => rows.map((row) => row.id.toUpperCase()),
      ),
    ).toEqual(["A", "B"]);
  });

  test("unwrapAndMap falls back to Unknown error when no message exists", () => {
    expect(() =>
      unwrapAndMap(
        {
          isSuccess: false,
          error: { statusCode: 500, message: "" },
        },
        (value) => value,
      ),
    ).toThrow("Unknown error");
  });
});
