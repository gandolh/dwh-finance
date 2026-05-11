import axios, { AxiosError } from 'axios';

export const handleAxiosError = (error: unknown): string => {
  let errorMessage = error instanceof Error ? error.message : String(error);
  let status: string | number = 'N/A';

  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    status = axiosError.response?.status || 'N/A';

    const data = axiosError.response?.data as any;

    const details =
      data?.message ||
      data?.error?.info ||
      data?.error?.message ||
      data?.status?.error_message ||
      (typeof data?.error === 'string' ? data.error : null) ||
      (typeof data === 'string' ? data : null) ||
      axiosError.message;

    errorMessage = `Status ${status}: ${details}`;
  }

  console.error(errorMessage);
  return errorMessage;
};
