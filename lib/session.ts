import crypto from "crypto";

export type SessionStudent = {
  student_id: string;
  fullname: string;
  class_id: string;
  no: string;
};

type SessionPayload = {
  student: SessionStudent;
  exp: number;
};

export const SESSION_COOKIE_NAME =
  "student_session";

const SESSION_MAX_AGE = 8 * 60 * 60;

function getSecret() {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not configured"
    );
  }

  return secret;
}

function base64url(input: string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(input: string) {
  return Buffer.from(
    input
      .replace(/-/g, "+")
      .replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

function createSignature(payload: string) {
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createSessionToken(
  student: SessionStudent
) {
  const payload: SessionPayload = {
    student,
    exp:
      Date.now() +
      SESSION_MAX_AGE * 1000,
  };

  const encodedPayload = base64url(
    JSON.stringify(payload)
  );

  const signature = createSignature(
    encodedPayload
  );

  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(
  token: string
): SessionStudent | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 2) {
      return null;
    }

    const [
      encodedPayload,
      signature,
    ] = parts;

    const expectedSignature =
      createSignature(encodedPayload);

    const actualBuffer = Buffer.from(
      signature
    );

    const expectedBuffer = Buffer.from(
      expectedSignature
    );

    if (
      actualBuffer.length !==
      expectedBuffer.length
    ) {
      return null;
    }

    if (
      !crypto.timingSafeEqual(
        actualBuffer,
        expectedBuffer
      )
    ) {
      return null;
    }

    const payload: SessionPayload =
      JSON.parse(
        fromBase64url(encodedPayload)
      );

    if (
      !payload.exp ||
      Date.now() > payload.exp
    ) {
      return null;
    }

    return payload.student;
  } catch {
    return null;
  }
}

export function getSessionToken(
  cookieHeader?: string
) {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [key, ...valueParts] =
      cookie.trim().split("=");

    if (key === SESSION_COOKIE_NAME) {
      return decodeURIComponent(
        valueParts.join("=")
      );
    }
  }

  return null;
}

export function setSessionCookie(
  res: {
    setHeader: (
      name: string,
      value: string
    ) => void;
  },
  token: string
) {
  const isProduction =
    process.env.NODE_ENV === "production";

  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(
      token
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}${
      isProduction ? "; Secure" : ""
    }`
  );
}

export function clearSessionCookie(
  res: {
    setHeader: (
      name: string,
      value: string
    ) => void;
  }
) {
  const isProduction =
    process.env.NODE_ENV === "production";

  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${
      isProduction ? "; Secure" : ""
    }`
  );
}