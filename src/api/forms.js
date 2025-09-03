export const submitForm = async (apiRoute, data) => {
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
      return "error";
    }
  } catch (error) {
    console.error(error);
    return "error";
  }
};
