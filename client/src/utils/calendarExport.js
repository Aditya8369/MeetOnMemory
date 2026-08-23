export const formatICSDate = (date) => {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
};

export const generateICS = (meeting) => {
  const title = meeting.title || "Untitled Meeting";
  const description = meeting.description || "";
  const location = meeting.venue || meeting.location || "";

  let agendaString = "";
  if (meeting.agendaItems && meeting.agendaItems.length > 0) {
    agendaString =
      "\n\nAgenda:\n" +
      meeting.agendaItems
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.text}${item.description ? ` - ${item.description}` : ""}`,
        )
        .join("\n");
  }

  const appUrl = `${window.location.origin}/meeting/${meeting._id}`;
  const fullDescription = `${description}${agendaString}\n\nView details in MeetOnMemory: ${appUrl}`;

  const startDate = new Date(meeting.date);
  const durationMins = meeting.duration || 60;
  const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MeetOnMemory//NONSGML v1.0//EN",
    "BEGIN:VEVENT",
    `UID:${meeting._id || Math.random().toString(36).substring(2, 11)}@meetonmemory.com`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${fullDescription.replace(/\n/g, "\\n")}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const getGoogleCalendarUrl = (meeting) => {
  const title = encodeURIComponent(meeting.title || "Untitled Meeting");
  const description = meeting.description || "";
  const location = encodeURIComponent(meeting.venue || meeting.location || "");

  let agendaString = "";
  if (meeting.agendaItems && meeting.agendaItems.length > 0) {
    agendaString =
      "\n\nAgenda:\n" +
      meeting.agendaItems
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.text}${item.description ? ` - ${item.description}` : ""}`,
        )
        .join("\n");
  }

  const appUrl = `${window.location.origin}/meeting/${meeting._id}`;
  const fullDescription = encodeURIComponent(
    `${description}${agendaString}\n\nView details in MeetOnMemory: ${appUrl}`,
  );

  const startDate = new Date(meeting.date);
  const durationMins = meeting.duration || 60;
  const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);

  const dates = `${formatICSDate(startDate)}/${formatICSDate(endDate)}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${fullDescription}&location=${location}`;
};

export const getOutlookCalendarUrl = (meeting) => {
  const title = encodeURIComponent(meeting.title || "Untitled Meeting");
  const description = meeting.description || "";
  const location = encodeURIComponent(meeting.venue || meeting.location || "");

  let agendaString = "";
  if (meeting.agendaItems && meeting.agendaItems.length > 0) {
    agendaString =
      "\n\nAgenda:\n" +
      meeting.agendaItems
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.text}${item.description ? ` - ${item.description}` : ""}`,
        )
        .join("\n");
  }

  const appUrl = `${window.location.origin}/meeting/${meeting._id}`;
  const fullDescription = encodeURIComponent(
    `${description}${agendaString}\n\nView details in MeetOnMemory: ${appUrl}`,
  );

  const startDate = new Date(meeting.date);
  const durationMins = meeting.duration || 60;
  const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);

  const startdt = encodeURIComponent(startDate.toISOString());
  const enddt = encodeURIComponent(endDate.toISOString());

  return `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${title}&startdt=${startdt}&enddt=${enddt}&body=${fullDescription}&location=${location}`;
};
