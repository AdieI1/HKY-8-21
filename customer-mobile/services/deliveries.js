const DELIVERY_STATUS = {
  assigned: "dispatched",
  accepted: "accepted",
  arrived_pickup: "arrived_pickup",
  loading_cargo: "loading_cargo",
  out_for_delivery: "out_for_delivery",
  arrived_dropoff: "arrived_dropoff",
  unloading_cargo: "unloading_cargo",
  returning_to_hq: "returning_to_hq",
  completed: "delivered",
  rejected: "rejected",
};

export const formatDeliveryRequest = (request) => {
  const delivery = request.delivery;
  const driver = delivery?.driver?.user;
  const vehicle = delivery?.vehicle;
  const date = request.created_at ? new Date(request.created_at) : null;

  return {
    id: request.request_id,
    cargoName: request.item_name || request.cargo_type || "Cargo",
    cargo: request.cargo_type || "Cargo",
    fragility: request.fragility,
    status: delivery?.driver_id || ["completed", "rejected"].includes(delivery?.status)
      ? DELIVERY_STATUS[delivery.status] || delivery.status
      : request.status,
    backendStatus: delivery?.status || request.status,
    route: [request.pickup_address, request.dropoff_address]
      .filter(Boolean)
      .map((address) => address.split(",")[0])
      .join(" - "),
    date: date
      ? date.toLocaleDateString("en-PH", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "",
    driver: driver?.full_name || "",
    vehicle: [vehicle?.brand, vehicle?.model].filter(Boolean).join(" "),
    plate: vehicle?.plate_number || "",
    distance: request.distance_km ? `${request.distance_km} km` : "",
    deliveryId: delivery?.delivery_id || null,
    driverId: delivery?.driver_id || null,
    hasReviewed: Boolean(delivery?.reviews && delivery.reviews.length > 0),
    reviews: delivery?.reviews || [],
  };
};

export const isActiveDelivery = (delivery) =>
  !["draft", "delivered", "rejected"].includes(delivery.status);
