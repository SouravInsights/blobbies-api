import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

interface ValidationIssue {
  instancePath?: string;
  params?: { additionalProperty?: string; [key: string]: unknown };
  message?: string;
}

/** Human names for the status codes we actually emit. */
const STATUS_NAMES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  415: 'Unsupported Media Type',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  503: 'Service Unavailable',
};

/**
 * One error shape for the whole API, and one that is actually useful.
 *
 * A validation failure names the option that was wrong — `expression must be
 * equal to one of the allowed values` tells a developer what to fix; Fastify's
 * default `querystring must be ...` does not.
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  const issues = error.validation;
  if (issues && issues.length > 0) {
    const issue = issues[0] as ValidationIssue;
    const param =
      issue.params?.additionalProperty ?? issue.instancePath?.replace(/^\//, '') ?? undefined;

    reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: param && issue.message ? `${param} ${issue.message}` : error.message,
      ...(param ? { param } : {}),
    });
    return;
  }

  const statusCode = error.statusCode ?? 500;

  // A 5xx is our fault: log it in full, but never leak internals to the client.
  if (statusCode >= 500) {
    request.log.error(error);
    reply.status(statusCode).send({
      statusCode,
      error: 'Internal Server Error',
      message: 'Something went wrong. The error has been logged.',
    });
    return;
  }

  reply.status(statusCode).send({
    statusCode,
    error: STATUS_NAMES[statusCode] ?? error.name ?? 'Error',
    message: error.message,
  });
}
