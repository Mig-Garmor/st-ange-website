export const submitForm = async (apiRoute, data, { onFieldErrors } = {}) => {
  try {
    const response = await fetch(`/api/${apiRoute}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data,
      }),
    });

    if (response.ok) {
      return "success";
    } else {
      const err = await response.json();
      console.error(err.error);
      if (response.status === 400 && err.errors && typeof err.errors === "object") onFieldErrors?.(err.errors);
      return "error";
    }
  } catch (error) {
    console.error(error);
    return "error";
  }
};
