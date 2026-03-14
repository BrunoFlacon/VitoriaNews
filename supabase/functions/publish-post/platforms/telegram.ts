export async function publishTelegram(content: any,media: any,connection: { access_token: any; page_id: any }){

const res=await fetch(
`https://api.telegram.org/bot${connection.access_token}/sendMessage`,
{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
chat_id:connection.page_id,
text:content
})
}
)

const data=await res.json()

if(!data.ok){

return{
success:false,
error:"Telegram error"
}

}

return{
success:true,
postId:data.result.message_id
}

}