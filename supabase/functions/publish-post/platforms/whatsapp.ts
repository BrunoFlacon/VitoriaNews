export async function publishWhatsApp(content,media,connection){

const res=await fetch(
`https://graph.facebook.com/v19.0/${connection.phone_number_id}/messages`,
{
method:"POST",
headers:{
Authorization:`Bearer ${connection.access_token}`,
"Content-Type":"application/json"
},
body:JSON.stringify({
messaging_product:"whatsapp",
to:connection.recipient,
type:"text",
text:{
body:content
}
})
}
)

const data=await res.json()

if(data.error){
return{
success:false,
error:data.error.message
}
}

return{
success:true,
postId:data.messages[0].id
}

}