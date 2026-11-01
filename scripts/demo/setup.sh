#!/bin/bash
CATALOG=http://localhost:3001/api/v1
INVENTORY=http://localhost:3002/api/v1
START=$(node -e 'console.log(new Date(Date.now() + 3 * 864e5).toISOString())')

event=$(curl -s -X POST $CATALOG/events -H "Content-Type: application/json" \
    -d '{"title":"Demo Night","category":"CONCERT","durationMinutes":120}')
event_id=$(echo "$event" | jq -r .id)
echo "catalog: event created"
echo "$event" | jq -c .

show=$(curl -s -X POST $CATALOG/events/$event_id/shows -H "Content-Type: application/json" \
    -d "{\"venue\":\"Demo Arena\",\"startsAt\":\"$START\",\"prices\":[{\"tier\":\"GOLD\",\"price\":2500},{\"tier\":\"SILVER\",\"price\":1200}]}")
show_id=$(echo "$show" | jq -r .id)
echo
echo "catalog: show created"
echo "$show" | jq -c .

seats=$(curl -s -o /dev/null -w "%{http_code}" -X POST $INVENTORY/shows/$show_id/seats -H "Content-Type: application/json" \
    -d '{"rows":[{"row":"A","count":4,"tier":"GOLD"},{"row":"B","count":4,"tier":"SILVER"}]}')
echo
echo "inventory: seats A1-A4 (GOLD) and B1-B4 (SILVER) created, HTTP $seats"

mkdir -p logs
echo "$show_id" > logs/demo-show
echo
echo "show $show_id is ready for booking"
echo "in Postman, set the collection variable showId to $show_id"
