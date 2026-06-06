import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { handleAxiosError } from '../../src/utils/axiosErrorHandler.ts';

describe('handleAxiosError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function axiosErrorWith(status: number, data: unknown): AxiosError {
    const error = new AxiosError('Request failed');
    error.response = {
      status,
      statusText: '',
      headers: {},
      config: { headers: new AxiosHeaders() },
      data,
    };
    return error;
  }

  it('returns the raw message for a plain (non-axios) Error', () => {
    expect(handleAxiosError(new Error('boom'))).toBe('boom');
  });

  it('stringifies a non-Error value', () => {
    expect(handleAxiosError('just a string')).toBe('just a string');
  });

  it('prefers a top-level message field', () => {
    expect(handleAxiosError(axiosErrorWith(429, { message: 'rate limited' }))).toBe('Status 429: rate limited');
  });

  it('reads the Frankfurter/ECB style error.info field', () => {
    expect(handleAxiosError(axiosErrorWith(400, { error: { info: 'bad currency' } }))).toBe('Status 400: bad currency');
  });

  it('reads the CoinGecko style status.error_message field', () => {
    const error = axiosErrorWith(401, { status: { error_message: 'invalid api key' } });
    expect(handleAxiosError(error)).toBe('Status 401: invalid api key');
  });

  it('handles a bare string error field', () => {
    expect(handleAxiosError(axiosErrorWith(403, { error: 'forbidden' }))).toBe('Status 403: forbidden');
  });

  it('handles a string body', () => {
    expect(handleAxiosError(axiosErrorWith(500, 'Internal Server Error'))).toBe('Status 500: Internal Server Error');
  });

  it('falls back to the axios message and N/A status when there is no response', () => {
    const error = new AxiosError('Network Error');
    expect(handleAxiosError(error)).toBe('Status N/A: Network Error');
  });
});
