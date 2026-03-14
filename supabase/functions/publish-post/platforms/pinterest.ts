export async function publishPinterest(content, media, connection){

if(!media.length){
return{
success:false,
error:"Pinterest requer imagem"
}
}

const res=await fetch(
"https://api.pinterest.com/v5/pins",
{
method:"POST",
headers:{
Authorization:`Bearer ${connection.access_token}`,
"Content-Type":"application/json"
},
body:JSON.stringify({
board_id:connection.page_id,
title:content.substring(0,100),
description:content,
media_source:{
source_type:"image_url",
url:media[0]
}
})
}
)

const data=await res.json()

if(data.message){
return{
success:false,
error:data.message
}
}

return{
success:true,
postId:data.id
}

}